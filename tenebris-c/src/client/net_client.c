#include "client/net_client.h"
#include "client/chat.h"
#include "client/remote_players.h"
#include "client/renderer.h"
#include "client/torch.h"
#include "core/goldberg.h"
#include "core/math.h"
#include "core/net_transport.h"
#include "core/proto.h"
#include "core/world.h"
#include "core/world_water.h"

#include "sokol_time.h"

#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

/* Player-position accessor provided by main_web.c so the /saves audit
 * can score distance from the camera to each persisted tile. Declared
 * here as an extern instead of pulling main_web.h to avoid coupling
 * the net layer to the game-loop module. Returns world-space dvec3. */
extern dvec3_t tenebris_get_local_player_pos(void);
extern uint32_t tenebris_get_local_player_body_id(void);

#define NET_NAME_MAX           32
#define NET_NAME_CACHE_SIZE    32

/* Per-player throttle for PLAYER_INFO_REQUEST retries. Each unknown
 * id in the F1 / nameplate path triggers one request and re-sends
 * once every NET_NAME_REQUEST_RETRY_S seconds while still unknown.
 * Sized to match the snapshot cap; one slot per concurrently-unknown
 * peer is plenty for a 16-slot room.
 *
 * After NET_NAME_REQUEST_WARN_AT attempts with no PLAYER_INFO reply
 * the client logs a console.error so a player who's stuck on id-N
 * forever can see why. After NET_NAME_REQUEST_MAX_TRIES we give up
 * retrying and leave the id as id-N - the server is either dropping
 * the request or doesn't know that peer anymore. */
#define NET_NAME_REQ_TABLE_SIZE      16
#define NET_NAME_REQUEST_RETRY_S     2.0
#define NET_NAME_REQUEST_WARN_AT     3       /* ~6 s */
#define NET_NAME_REQUEST_MAX_TRIES   5       /* ~10 s */

/* Block-edit ack tracking. Every PLAYER_CMD we send is held here until
 * the server's CHUNK_DIFF echo confirms it; missing acks are logged as
 * errors so we surface "the server lost my edit" the moment it happens
 * instead of waiting for the player to log back in and notice missing
 * blocks. Cap is comfortably larger than any plausible burst within
 * the timeout window (creative-mode click spam tops out around 10/s). */
#define NET_PENDING_EDITS_MAX        128
#define NET_EDIT_ACK_TIMEOUT_S       5.0

/* Sized to one slot per body the server can replay edits for - matches
 * SERVER_MAX_BODIES on the server side. The counters are dense, not
 * sparse: every body the client ever sees a diff for gets one slot
 * for the rest of the session. */
#define NET_BODY_COVERAGE_MAX        32

/* /saves audit timing. The audit kicks once per connection after
 * NET_AUDIT_MIN_READY_S in NET_CLIENT_READY AND NET_AUDIT_QUIET_S
 * since the last CHUNK_DIFF. Both gates matter: the min-ready prevents
 * the audit from firing before the server even sends its first
 * replay batch on a slow link, and the quiet gate prevents firing
 * mid-stream when the server's still pushing hundreds of diffs. */
#define NET_AUDIT_MIN_READY_S        3.0
#define NET_AUDIT_QUIET_S            2.0

/* Distance from the player below which an audit miss is logged as
 * an ERROR (the tile is in /saves but no CHUNK_DIFF for it ever
 * arrived AND the player is close enough that the missing blocks
 * would be visible). Misses outside this radius drop to a count-only
 * summary so a flyby of a 160k-tile planet doesn't spam the console
 * with every tile on the far side. */
#define NET_AUDIT_NEAR_RADIUS_M      256.0

typedef struct {
    uint32_t player_id;
    char     name[NET_NAME_MAX];
} net_name_entry_t;

typedef struct {
    uint32_t player_id;
    double   last_request_s;     /* 0 == never */
    int      attempts;           /* how many requests we've sent */
    bool     nacked;             /* server replied "unknown id" - stop retrying */
    bool     warned;             /* console.error already emitted, don't spam */
} net_name_request_t;

typedef struct {
    net_client_state_t   state;
    net_conn_t*          conn;
    net_client_welcome_t welcome;
    /* Profile sent in HELLO. Token is the persistent identifier;
     * name is the friendly display string other clients see. */
    char                 profile_token[33];
    char                 profile_name[NET_NAME_MAX];
    /* Room code to join (8 chars max). Empty = public room. */
    char                 room_code[9];
    /* Name cache: player_id → name, populated from MSG_PLAYER_INFO
     * (and from WELCOME for the local player). The F1 panel reads
     * net_client_name_for_id to render rows. */
    net_name_entry_t     names[NET_NAME_CACHE_SIZE];
    int                  name_count;
    /* Pending PLAYER_INFO_REQUEST throttle. */
    net_name_request_t   name_requests[NET_NAME_REQ_TABLE_SIZE];
    int                  name_request_count;
    /* Most recent DESYNC notice from the server. last_desync_time is
     * a sokol_time stamp (0 = never). The HUD compares against
     * stm_now() and fades the warning out after a few seconds. */
    net_desync_kind_t    last_desync;
    uint32_t             last_desync_block;
    uint64_t             last_desync_time;
    /* Last connection-failure reason, populated by on_close (or by
     * net_client_connect when net_connect returns NULL). Plain ASCII,
     * empty until something fails. The menu reads this to render the
     * in-game error dialog. */
    char                 error_message[96];
    /* True after a server-issued MSG_KICK with a terminal reason
     * (version mismatch, etc). The menu retry loop reads this and
     * goes straight to the disconnected popup rather than retrying
     * a connection that will never succeed. Cleared on every
     * net_client_connect call. */
    bool                 no_retry;
    /* Pending inventory restore from server. Set when MSG_INVENTORY_STATE
     * arrives; cleared by net_client_take_pending_inventory. */
    bool                 inv_pending;
    uint16_t             inv_slot_type [9];
    int16_t              inv_slot_count[9];
    uint8_t              inv_selected;
    /* Outstanding block-edit round-trip table. Every PLAYER_CMD push
     * goes in here so we can confirm the server applied + broadcast it
     * back via MSG_CHUNK_DIFF. An entry stays until either:
     *   - a CHUNK_DIFF for the same (body, tile, depth) acks it (RTT
     *     logged),
     *   - the timeout elapses (logged as an ERROR via stderr - the
     *     server silently dropped our edit, the persistence path will
     *     not pick it up on rejoin).
     * Sized to the worst-case place-spam burst within the timeout
     * window; older entries are evicted oldest-first if we ever fill,
     * which itself is logged as an error. */
    struct {
        uint32_t body_id;
        uint32_t tile_idx;
        uint16_t depth;
        uint16_t expected_block;
        uint8_t  cmd_kind;
        uint64_t sent_time;       /* sokol stm_now() - 0 means slot free */
        uint32_t seq;
    }                    pending_edits[NET_PENDING_EDITS_MAX];
    uint32_t             next_edit_seq;
    uint32_t             edits_sent_total;
    uint32_t             edits_acked_total;
    uint32_t             edits_timed_out_total;
    /* Per-body running tally of unique tile columns we've seen in
     * CHUNK_DIFF replays this session. One CHUNK_DIFF carries 64
     * (tile, depth) entries; a full column fans out across 2 messages
     * so a fresh-join replay for one tile = +2 messages but +1 unique
     * tile in this counter. The counter is keyed by body_id and
     * maintained as a small in-memory set of "last seen" tile ids
     * per body - good enough for the operator-facing log we use to
     * compare against /saves output, without paying for a real hash
     * table.
     *
     * `tile_bits` is the bitset of every tile_idx we've seen at least
     * one CHUNK_DIFF entry for on this body. Sized to the body's
     * tile_count at first-touch and never resized. Drives the /saves
     * audit which cross-references our received set against the
     * server's authoritative list. */
    struct {
        uint32_t body_id;
        uint32_t edits_seen;      /* total entries across all diffs */
        uint32_t unique_tiles;    /* count of distinct tile ids seen */
        uint32_t last_tile_seen;  /* dedup tip for back-to-back same-tile diffs */
        bool     last_tile_valid;
        uint8_t* tile_bits;       /* bit per tile_idx, NULL until allocated */
        int      tile_bits_bytes; /* size of tile_bits in bytes */
        int      world_tile_count;
    }                    body_coverage[NET_BODY_COVERAGE_MAX];
    int                  body_coverage_count;

    /* /saves audit: fires once per connection, after CHUNK_DIFF replays
     * settle. last_chunk_diff_time is bumped on every received diff;
     * once it goes quiet for NET_AUDIT_QUIET_S and we've been READY for
     * at least NET_AUDIT_MIN_READY_S, we kick the HTTP fetch. */
    char                 server_url[160];
    uint64_t             ready_time;          /* stm_now() when state became READY */
    uint64_t             last_chunk_diff_time;/* stm_now() of last CHUNK_DIFF received */
    bool                 audit_triggered;     /* true once fetch fired */
    /* Per-body HTTP fetch tracking. Each body's /saves/body response
     * applies once per connection - subsequent re-approaches reuse
     * the already-applied in-memory state. Tracked as a small dense
     * array keyed by body_id. NOT a bitset because we want three
     * states (never asked / in-flight / done), and 32 bodies is
     * trivially small. */
    struct {
        uint32_t body_id;
        uint8_t  state;            /* 0 idle, 1 in-flight, 2 done */
    }                    body_fetch[NET_BODY_COVERAGE_MAX];
    int                  body_fetch_count;
} net_client_t;

static net_client_t C;

/* Forward decls so on_msg (above) can call into the pending-edit
 * helpers (defined further down next to net_client_send_edit). */
static bool pending_edit_try_ack(uint32_t body_id, uint32_t tile_idx,
                                   uint16_t depth, uint16_t block_seen);
static void pending_edit_check_timeouts(void);

/* ------------------------------------------------------------------ */
/* Transport callbacks. The transport's poll fires these on the main
 * thread (browser) or the tick thread (native loopback), so we can
 * mutate C directly. */
/* ------------------------------------------------------------------ */

static void cache_name(uint32_t player_id, const char* name) {
    if (!name || !*name) return;
    /* Update existing entry if present. */
    for (int i = 0; i < C.name_count; ++i) {
        if (C.names[i].player_id == player_id) {
            snprintf(C.names[i].name, sizeof C.names[i].name, "%s", name);
            return;
        }
    }
    if (C.name_count < NET_NAME_CACHE_SIZE) {
        C.names[C.name_count].player_id = player_id;
        snprintf(C.names[C.name_count].name,
                 sizeof C.names[C.name_count].name, "%s", name);
        ++C.name_count;
    }
}

/* Fire a PLAYER_INFO_REQUEST for player_id, but only if our last
 * request for that id is older than NET_NAME_REQUEST_RETRY_S. The
 * F1 panel can therefore call net_client_name_for_id every frame on
 * a missing id without spamming the server. */
static void request_name(uint32_t player_id) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (player_id == 0) return;
    double now = stm_sec(stm_now());
    net_name_request_t* slot = NULL;
    for (int i = 0; i < C.name_request_count; ++i) {
        if (C.name_requests[i].player_id == player_id) {
            slot = &C.name_requests[i];
            break;
        }
    }
    if (!slot) {
        if (C.name_request_count >= NET_NAME_REQ_TABLE_SIZE) return;
        slot = &C.name_requests[C.name_request_count++];
        slot->player_id      = player_id;
        slot->last_request_s = 0.0;
        slot->attempts       = 0;
        slot->nacked         = false;
        slot->warned         = false;
    }
    if (slot->nacked) return;                 /* server already said "unknown" */
    if (slot->attempts >= NET_NAME_REQUEST_MAX_TRIES) return;
    if (slot->last_request_s != 0.0
        && now - slot->last_request_s < NET_NAME_REQUEST_RETRY_S) {
        return;
    }
    slot->last_request_s = now;
    ++slot->attempts;
    if (!slot->warned && slot->attempts >= NET_NAME_REQUEST_WARN_AT) {
        fprintf(stderr,
                "[net-client] WARN: no PLAYER_INFO for player_id=%u after %d "
                "requests (~%.0fs). Server may not know this peer or "
                "responses are being dropped.\n",
                player_id, slot->attempts,
                (double)slot->attempts * NET_NAME_REQUEST_RETRY_S);
        slot->warned = true;
    }
    msg_player_info_request_t req = { .player_id = player_id, .reserved = 0 };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_INFO_REQUEST_WIRE_SIZE];
    size_t n = proto_write_player_info_request(buf, sizeof buf, &req);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

const char* net_client_name_for_id(uint32_t player_id) {
    for (int i = 0; i < C.name_count; ++i) {
        if (C.names[i].player_id == player_id) return C.names[i].name;
    }
    /* Cache miss: kick off a (throttled) PLAYER_INFO_REQUEST so the
     * next render after the server replies has a real name. Returning
     * NULL right now is fine - callers already render id-N fallback. */
    request_name(player_id);
    return NULL;
}

void net_client_set_profile(const char* token, const char* name,
                              const char* room_code) {
    memset(C.profile_token, 0, sizeof C.profile_token);
    memset(C.profile_name,  0, sizeof C.profile_name);
    memset(C.room_code,     0, sizeof C.room_code);
    if (token)     snprintf(C.profile_token, sizeof C.profile_token, "%s", token);
    if (name)      snprintf(C.profile_name,  sizeof C.profile_name,  "%s", name);
    if (room_code) snprintf(C.room_code,     sizeof C.room_code,     "%s", room_code);
}

static void send_hello(void) {
    msg_hello_t h = { 0 };
    h.client_version = TENEBRIS_PROTOCOL_VERSION;
    /* token: copy at most MSG_HELLO_TOKEN_LEN bytes (no null on wire). */
    size_t tn = strnlen(C.profile_token, MSG_HELLO_TOKEN_LEN);
    memcpy(h.token, C.profile_token, tn);
    /* name: same — null-padded fixed-32. */
    size_t nn = strnlen(C.profile_name, MSG_HELLO_NAME_LEN);
    memcpy(h.name, C.profile_name, nn);
    /* room: null-padded fixed-8. Empty string = public room. */
    size_t rn = strnlen(C.room_code, MSG_HELLO_ROOM_LEN);
    memcpy(h.room_code, C.room_code, rn);
    uint8_t buf[MSG_HEADER_SIZE + MSG_HELLO_WIRE_SIZE];
    size_t n = proto_write_hello(buf, sizeof buf, &h);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
    C.state = NET_CLIENT_HANDSHAKE;
    printf("[net-client] HELLO sent (name='%s' room='%s' %s)\n",
           C.profile_name[0] ? C.profile_name : "(empty)",
           C.room_code[0]    ? C.room_code    : "",
           C.room_code[0]    ? "private-room" : "EMPTY-CODE -> lobby room");
}

static void on_open(net_conn_t* conn, void* user) {
    (void)conn; (void)user;
    printf("[net-client] socket open\n");
    send_hello();
}

static void on_msg(net_conn_t* conn, net_channel_t ch,
                     const void* data, size_t len, void* user) {
    (void)conn; (void)ch; (void)user;

    msg_hdr_t hdr;
    if (proto_read_header((const uint8_t*)data, len, &hdr) != 0) {
        fprintf(stderr, "[net-client] short header (%zu bytes)\n", len);
        return;
    }
    if (len < MSG_HEADER_SIZE + hdr.length) {
        fprintf(stderr, "[net-client] truncated payload (have %zu, need %u)\n",
                len, MSG_HEADER_SIZE + hdr.length);
        return;
    }
    const uint8_t* payload = (const uint8_t*)data + MSG_HEADER_SIZE;

    switch ((msg_kind_t)hdr.kind) {
        case MSG_WELCOME: {
            if (hdr.version != MSG_WELCOME_VERSION) {
                fprintf(stderr, "[net-client] WELCOME version %u != %u\n",
                        hdr.version, MSG_WELCOME_VERSION);
                C.state = NET_CLIENT_ERROR;
                return;
            }
            msg_welcome_t w;
            if (proto_read_welcome(payload, hdr.length, &w) != 0) {
                fprintf(stderr, "[net-client] malformed WELCOME\n");
                C.state = NET_CLIENT_ERROR;
                return;
            }
            C.welcome.player_id   = w.player_id;
            C.welcome.world_seed  = w.world_seed;
            C.welcome.spawn_x     = w.spawn_x;
            C.welcome.spawn_y     = w.spawn_y;
            C.welcome.spawn_z     = w.spawn_z;
            C.welcome.body_id     = w.body_id;
            C.welcome.spawn_yaw   = w.spawn_yaw;
            C.welcome.spawn_pitch = w.spawn_pitch;
            C.state = NET_CLIENT_READY;
            C.ready_time = stm_now();
            C.last_chunk_diff_time = C.ready_time;
            /* Arm chat's backlog-suppression grace window. The server
             * follows WELCOME with a flurry of MSG_CHAT messages
             * replaying the room's recent chat history; without
             * this hook every reconnect floods the HUD with already-
             * seen logs because the recv-time stamps look fresh. */
            chat_begin_session();
            /* Kick off the lazy fetch for the spawn body so the
             * player's first frame in MP shows persisted blocks
             * without waiting for body_load_detail (the active body
             * never triggers that path - it's meshed at register
             * time). Deferred bodies fetch from body_load_detail. */
            net_client_fetch_body_saves(w.body_id);
            /* Cache our own name so F1 can show it for the local
             * player too — the server has it from HELLO but doesn't
             * echo it in WELCOME; the locally-known profile name is
             * the ground truth. */
            cache_name(w.player_id, C.profile_name);
            printf("[net-client] READY: player_id=%u seed=%llu "
                   "spawn=(%.2f, %.2f, %.2f) body=%u\n",
                   w.player_id, (unsigned long long)w.world_seed,
                   w.spawn_x, w.spawn_y, w.spawn_z, w.body_id);
            break;
        }
        case MSG_CHAT: {
            if (hdr.version != MSG_CHAT_VERSION) break;
            msg_chat_t m;
            if (proto_read_chat(payload, hdr.length, &m) != 0) break;
            char text[MSG_CHAT_TEXT_LEN + 1];
            memcpy(text, m.text, MSG_CHAT_TEXT_LEN);
            text[MSG_CHAT_TEXT_LEN] = 0;
            const char* sender = net_client_name_for_id(m.player_id);
            chat_post_recv(m.player_id,
                            sender ? sender : "?",
                            text);
            break;
        }
        case MSG_INVENTORY_STATE: {
            if (hdr.version != MSG_INVENTORY_STATE_VERSION) break;
            msg_inventory_state_t inv;
            if (proto_read_inventory_state(payload, hdr.length, &inv) != 0) break;
            memcpy(C.inv_slot_type,  inv.slot_type,  sizeof C.inv_slot_type);
            memcpy(C.inv_slot_count, inv.slot_count, sizeof C.inv_slot_count);
            C.inv_selected = (inv.selected < 9) ? inv.selected : 0;
            C.inv_pending  = true;
            printf("[net-client] inventory restored from server (selected=%u)\n",
                   (unsigned)C.inv_selected);
            break;
        }
        case MSG_PLAYER_INFO: {
            if (hdr.version != MSG_PLAYER_INFO_VERSION) break;
            msg_player_info_t info;
            if (proto_read_player_info(payload, hdr.length, &info) != 0) break;
            /* Server name is null-padded fixed-32; treat as C string. */
            char name[MSG_PLAYER_INFO_NAME_LEN + 1];
            memcpy(name, info.name, MSG_PLAYER_INFO_NAME_LEN);
            name[MSG_PLAYER_INFO_NAME_LEN] = 0;
            cache_name(info.player_id, name);
            /* Clear any pending-request slot for this id so a peer
             * who reconnects later can be re-resolved cleanly. */
            for (int i = 0; i < C.name_request_count; ++i) {
                if (C.name_requests[i].player_id == info.player_id) {
                    C.name_requests[i].attempts       = 0;
                    C.name_requests[i].nacked         = false;
                    C.name_requests[i].warned         = false;
                    C.name_requests[i].last_request_s = 0.0;
                    break;
                }
            }
            break;
        }
        case MSG_PLAYER_INFO_NACK: {
            if (hdr.version != MSG_PLAYER_INFO_NACK_VERSION) break;
            msg_player_info_nack_t nack;
            if (proto_read_player_info_nack(payload, hdr.length, &nack) != 0) break;
            const char* reason_str =
                (nack.reason == PLAYER_INFO_NACK_UNKNOWN_ID) ? "unknown_id"
                                                              : "unspecified";
            fprintf(stderr,
                    "[net-client] ERROR: server cannot resolve name for "
                    "player_id=%u (reason=%s). Will stop retrying this id.\n",
                    nack.player_id, reason_str);
            /* Mark the slot so future net_client_name_for_id calls
             * don't trigger more requests. Create the slot if it
             * doesn't exist (e.g. a stale NACK from before we asked). */
            net_name_request_t* slot = NULL;
            for (int i = 0; i < C.name_request_count; ++i) {
                if (C.name_requests[i].player_id == nack.player_id) {
                    slot = &C.name_requests[i];
                    break;
                }
            }
            if (!slot && C.name_request_count < NET_NAME_REQ_TABLE_SIZE) {
                slot = &C.name_requests[C.name_request_count++];
                slot->player_id      = nack.player_id;
                slot->last_request_s = 0.0;
                slot->attempts       = 0;
                slot->warned         = false;
            }
            if (slot) slot->nacked = true;
            break;
        }
        case MSG_KICK: {
            if (hdr.version != MSG_KICK_VERSION) break;
            msg_kick_t k;
            if (proto_read_kick(payload, hdr.length, &k) != 0) break;
            /* Copy the server-supplied text into the error slot the
             * menu reads when it promotes ERROR -> popup. Truncate
             * cleanly at the smaller buffer. */
            char text[MSG_KICK_TEXT_LEN + 1];
            memcpy(text, k.text, MSG_KICK_TEXT_LEN);
            text[MSG_KICK_TEXT_LEN] = 0;
            snprintf(C.error_message, sizeof C.error_message, "%s",
                     text[0] ? text : "kicked");
            C.no_retry = true;
            C.state    = NET_CLIENT_ERROR;
            printf("[net-client] KICK reason=%u text='%s'\n",
                   k.reason, text);
            break;
        }
        case MSG_DESYNC: {
            if (hdr.version != MSG_DESYNC_VERSION) break;
            msg_desync_t d;
            if (proto_read_desync(payload, hdr.length, &d) != 0) break;
            C.last_desync       = (net_desync_kind_t)d.reason;
            C.last_desync_block = d.block_type;
            C.last_desync_time  = stm_now();
            /* Loud console line — emscripten pipes printf to console.log,
             * so this lands in browser devtools. Two messages so it's
             * easy to spot among the rest of the per-frame chatter. */
            fprintf(stderr,
                    "============================================================\n"
                    "[DESYNC] server rejected pose at (%.1f, %.1f, %.1f)\n"
                    "         reason=%u  body=%u  block=%u\n"
                    "============================================================\n",
                    d.client_pos_x, d.client_pos_y, d.client_pos_z,
                    (unsigned)d.reason, (unsigned)d.body_id,
                    (unsigned)d.block_type);
            break;
        }
        case MSG_CHUNK_DIFF: {
            if (hdr.version != MSG_CHUNK_DIFF_VERSION) break;
            msg_chunk_diff_t diff;
            if (proto_read_chunk_diff(payload, hdr.length, &diff) != 0) {
                fprintf(stderr, "[net-client] malformed CHUNK_DIFF\n");
                break;
            }
            world_t* w = renderer_world_for_body(diff.body_id);
            if (!w) {
                /* Replay diffs land here for bodies the renderer has
                 * never seen - that's silently dropped by world_set,
                 * but the diff itself is real persistence data we just
                 * lost. Loud error. */
                fprintf(stderr,
                        "[net-client] ERROR: CHUNK_DIFF for body=%u not registered "
                        "with renderer (edits=%u DROPPED). If this fires at join "
                        "time, the server-replayed persisted blocks will not show.\n",
                        diff.body_id, (unsigned)diff.edit_count);
                break;
            }
            int matched_acks = 0;
            uint32_t first_tile = 0;
            uint16_t first_depth = 0;
            uint16_t first_block = 0;
            uint32_t last_tile  = 0;
            uint16_t last_depth = 0;
            for (int i = 0; i < diff.edit_count; ++i) {
                const msg_chunk_diff_entry_t* e = &diff.edits[i];
                if (i == 0) {
                    first_tile  = e->tile_idx;
                    first_depth = e->depth;
                    first_block = e->block_type;
                }
                last_tile  = e->tile_idx;
                last_depth = e->depth;
                /* world_set marks the tile dirty; the renderer's mesh
                 * dirty sweep remeshes it on the next frame. Same path
                 * as locally-applied edits. */
                world_set(w, (int)e->tile_idx, (int)e->depth,
                            (block_t)e->block_type);
                /* Round-trip ack: try to pair this entry with one of
                 * our outstanding sends. Replays at join time and
                 * peer-driven edits will simply not match anything in
                 * the table (no error - we never sent them). */
                if (pending_edit_try_ack(diff.body_id, e->tile_idx,
                                           e->depth, e->block_type)) {
                    ++matched_acks;
                }
            }
            /* Per-body running tally: find / allocate a slot, add this
             * diff's entry count, bump unique-tile counter when the
             * leading tile id changes (server's chunk-replay path emits
             * each tile as a contiguous run of one or two messages, so
             * the leading-tile dedup matches reality). */
            int slot = -1;
            for (int s = 0; s < C.body_coverage_count; ++s) {
                if (C.body_coverage[s].body_id == diff.body_id) { slot = s; break; }
            }
            if (slot < 0 && C.body_coverage_count < NET_BODY_COVERAGE_MAX) {
                slot = C.body_coverage_count++;
                C.body_coverage[slot].body_id         = diff.body_id;
                C.body_coverage[slot].edits_seen      = 0;
                C.body_coverage[slot].unique_tiles    = 0;
                C.body_coverage[slot].last_tile_valid = false;
                C.body_coverage[slot].tile_bits       = NULL;
                C.body_coverage[slot].tile_bits_bytes = 0;
                C.body_coverage[slot].world_tile_count= w->tile_count;
                /* Lazily allocate the tile bitset on first sight of this
                 * body. Sized to the world's tile_count so the audit
                 * can iterate every possible tile id without bounds
                 * checks. Calloc -> zero -> "nothing received yet". */
                int bytes = (w->tile_count + 7) / 8;
                C.body_coverage[slot].tile_bits = (uint8_t*)calloc((size_t)bytes, 1);
                if (C.body_coverage[slot].tile_bits) {
                    C.body_coverage[slot].tile_bits_bytes = bytes;
                } else {
                    fprintf(stderr,
                            "[net-client] WARN: tile_bits calloc(%d) failed for body=%u, "
                            "audit will miss this body\n",
                            bytes, diff.body_id);
                }
            }
            if (slot >= 0) {
                C.body_coverage[slot].edits_seen += diff.edit_count;
                if (!C.body_coverage[slot].last_tile_valid
                    || C.body_coverage[slot].last_tile_seen != first_tile) {
                    ++C.body_coverage[slot].unique_tiles;
                    C.body_coverage[slot].last_tile_seen  = last_tile;
                    C.body_coverage[slot].last_tile_valid = true;
                } else {
                    /* Same leading tile as last message - this is the
                     * 64..127 continuation of the same column. Not a
                     * new unique tile. */
                    C.body_coverage[slot].last_tile_seen = last_tile;
                }
                /* Record every distinct tile_idx in this diff for the
                 * audit. Cheap: 64 iterations max. */
                uint8_t* bits = C.body_coverage[slot].tile_bits;
                int bytes    = C.body_coverage[slot].tile_bits_bytes;
                int tcount   = C.body_coverage[slot].world_tile_count;
                if (bits) {
                    for (int i = 0; i < diff.edit_count; ++i) {
                        uint32_t t = diff.edits[i].tile_idx;
                        if ((int)t >= 0 && (int)t < tcount) {
                            int byte = (int)t >> 3;
                            if (byte < bytes) bits[byte] |= (uint8_t)(1u << (t & 7));
                        }
                    }
                }
            }
            C.last_chunk_diff_time = stm_now();
            /* Per-message detail: leading + trailing (tile, depth) and
             * the block id of the first entry so the operator can
             * compare against /saves output line by line. Trailing pair
             * helps tell apart "1 column, 64 entries" from "64 separate
             * tiles" (the server's reply currently uses run-by-tile, so
             * leading == trailing tile means a single-column batch). */
            const char* body_name =
                (w && w->body && w->body->name) ? w->body->name : "?";
            printf("[net-client] CHUNK_DIFF recv body=%u (%s) edits=%u "
                   "first=(tile=%u,d=%u,block=%u) last=(tile=%u,d=%u) "
                   "(%d acks, %d replay/peer) | body-totals: edits=%u unique_tiles=%u\n",
                   diff.body_id, body_name, (unsigned)diff.edit_count,
                   first_tile, (unsigned)first_depth, (unsigned)first_block,
                   last_tile,  (unsigned)last_depth,
                   matched_acks, diff.edit_count - matched_acks,
                   slot >= 0 ? C.body_coverage[slot].edits_seen : 0,
                   slot >= 0 ? C.body_coverage[slot].unique_tiles : 0);
            break;
        }
        case MSG_TORCH_DIFF: {
            if (hdr.version != MSG_TORCH_DIFF_VERSION) break;
            msg_torch_diff_t diff;
            if (proto_read_torch_diff(payload, hdr.length, &diff) != 0) {
                fprintf(stderr, "[net-client] malformed TORCH_DIFF\n");
                break;
            }
            world_t* w = renderer_world_for_body(diff.body_id);
            if (!w) {
                /* The body isn't registered with the renderer yet. This
                 * is normal for the initial-sync TORCH_DIFFs that
                 * arrive right after WELCOME for moons / planets the
                 * client hasn't approached yet. Bodies stream in
                 * lazily; the server resends torches when the player
                 * teleports. For now, drop. */
                fprintf(stderr,
                        "[net-client] TORCH_DIFF body=%u not yet registered "
                        "(entries=%u dropped)\n",
                        diff.body_id, (unsigned)diff.entry_count);
                break;
            }
            /* Per-entry dedup epsilon: match server. Two torches with
             * the same tile_idx and positions within ~10 cm are
             * considered the same torch (round-tripped echo of our
             * own placement). */
            const float MATCH_EPS_M = 0.1f;
            const float MATCH_EPS2  = MATCH_EPS_M * MATCH_EPS_M;
            const float REMOVE_RANGE_M = 1.0f;
            int placed = 0, removed = 0, skipped = 0;
            for (int i = 0; i < diff.entry_count; ++i) {
                const msg_torch_entry_t* e = &diff.entries[i];
                if (e->op == TORCH_OP_PLACE) {
                    /* Dedup against the local torch list. */
                    const torch_t* list = torch_list();
                    int n = torch_count();
                    bool dup = false;
                    for (int j = 0; j < n; ++j) {
                        float dx = list[j].position.x - e->pos_x;
                        float dy = list[j].position.y - e->pos_y;
                        float dz = list[j].position.z - e->pos_z;
                        if (dx*dx + dy*dy + dz*dz <= MATCH_EPS2) { dup = true; break; }
                    }
                    if (dup) { ++skipped; continue; }
                    vec3_t pos = { e->pos_x, e->pos_y, e->pos_z };
                    vec3_t up  = { e->up_x,  e->up_y,  e->up_z  };
                    if (torch_place(pos, up, (int)e->tile_idx)) {
                        world_dirty_in_range(w, pos, 6.0f);  /* TORCH_LIGHT_RANGE_M */
                        ++placed;
                    }
                } else if (e->op == TORCH_OP_REMOVE) {
                    vec3_t pos = { e->pos_x, e->pos_y, e->pos_z };
                    if (torch_remove_near(pos, REMOVE_RANGE_M)) {
                        world_dirty_in_range(w, pos, 6.0f);
                        ++removed;
                    } else {
                        ++skipped;
                    }
                }
            }
            const char* body_name =
                (w && w->body && w->body->name) ? w->body->name : "?";
            printf("[net-client] TORCH_DIFF recv body=%u (%s) entries=%u "
                   "placed=%d removed=%d echo/skip=%d\n",
                   diff.body_id, body_name, (unsigned)diff.entry_count,
                   placed, removed, skipped);
            break;
        }
        case MSG_WATER_STATE_DIFF: {
            if (hdr.version != MSG_WATER_STATE_DIFF_VERSION) break;
            msg_water_state_diff_t wsd;
            if (proto_read_water_state_diff(payload, hdr.length, &wsd) != 0) {
                fprintf(stderr, "[net-client] malformed WATER_STATE_DIFF\n");
                break;
            }
            world_t* w = renderer_world_for_body(wsd.body_id);
            if (!w) break;
            /* Apply the column into the local state-byte array via
             * the load-path helper, which is the same entry point
             * the SP /persist code uses on world load - it copies
             * straight into world_water's state without setting the
             * persist-dirty bit (the data already round-tripped via
             * the server). The mesher reads state next chunk-rebuild
             * cycle, so the bell-curve / falling visuals catch up
             * with the next remesh pass on the affected chunk. */
            world_water_load_state_column(w, (int)wsd.tile_idx, wsd.state);
            /* Mark the tile dirty so the renderer rebuilds the
             * chunk's water mesh. The block-level CHUNK_DIFF that
             * landed in the same step usually already dirtied this
             * tile, but a pure state-only change (level shift
             * without a block toggle) wouldn't, so do it here. */
            world_tile_mark_dirty(w, (int)wsd.tile_idx);
            break;
        }
        case MSG_SNAPSHOT: {
            if (hdr.version != MSG_SNAPSHOT_VERSION) break;
            msg_snapshot_t snap;
            if (proto_read_snapshot(payload, hdr.length, &snap) != 0) {
                fprintf(stderr, "[net-client] malformed SNAPSHOT\n");
                break;
            }
            remote_pose_t out[REMOTE_PLAYERS_MAX];
            int n_out = 0;
            for (int i = 0; i < snap.player_count; ++i) {
                const msg_snapshot_entry_t* e = &snap.players[i];
                /* Skip the local player so we don't draw our own
                 * marker on top of the camera. */
                if (e->player_id == C.welcome.player_id) continue;
                if (n_out >= REMOTE_PLAYERS_MAX) break;
                remote_pose_t* r = &out[n_out++];
                r->player_id = e->player_id;
                r->body_id   = e->body_id;
                r->pos.x     = e->pos_x;
                r->pos.y     = e->pos_y;
                r->pos.z     = e->pos_z;
                r->yaw       = e->yaw;
                r->pitch     = e->pitch;
            }
            remote_players_set_from_snapshot(out, n_out);
            /* Diagnostic: log every ~5 s (33 snapshots at 6.7 Hz) so
             * we can confirm the server's sending us peers. Quiet
             * enough not to drown out real warnings. */
            static uint64_t snap_recv = 0;
            ++snap_recv;
            /* if ((snap_recv % 33) == 0) {
             *     printf("[net-client] snapshot #%llu: %u entries (kept %d remote)\n",
             *            (unsigned long long)snap_recv,
             *            (unsigned)snap.player_count, n_out);
             * } */
            break;
        }
        default:
            /* Ignore unknown kinds so the server can ship new ones
             * without breaking us. */
            break;
    }
}

void net_client_send_chat(const char* text) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (!text || !*text) return;
    msg_chat_t m = { 0 };
    /* player_id is filled by the server when it broadcasts; we leave
     * it zero on the wire. */
    size_t n = strnlen(text, MSG_CHAT_TEXT_LEN);
    memcpy(m.text, text, n);
    uint8_t buf[MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE];
    size_t w = proto_write_chat(buf, sizeof buf, &m);
    if (w == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, w);
}

/* ------------------------------------------------------------------ */
/* Block-edit round-trip tracking.
 *
 * The wire protocol has no explicit ACK; the server's authoritative
 * answer is the MSG_CHUNK_DIFF it broadcasts back to the same room
 * after applying the edit. That broadcast is our ack: when a CHUNK_DIFF
 * entry matches a (body, tile, depth) we still have outstanding, the
 * round-trip is closed and the RTT logged. Anything that ages past
 * NET_EDIT_ACK_TIMEOUT_S is dumped to stderr as an error - the server
 * lost it, the persistence path will not save it, and the next time
 * the player joins the block will be missing. We want that loud now.
 * ------------------------------------------------------------------ */

static int pending_edit_alloc_slot(void) {
    /* First free slot wins. Returns -1 only when the table is full,
     * which itself is logged by the caller. */
    for (int i = 0; i < NET_PENDING_EDITS_MAX; ++i) {
        if (C.pending_edits[i].sent_time == 0) return i;
    }
    return -1;
}

static const char* edit_kind_name(uint8_t kind) {
    return (kind == PLAYER_CMD_BREAK) ? "BREAK" : "PLACE";
}

/* Try to ack the oldest outstanding edit matching (body, tile, depth).
 * Returns true on a hit. block_seen is what the server says the cell
 * actually holds now; if it disagrees with what we asked for, we log
 * a WARN (the server overrode us, e.g. survival range / inventory
 * check) but still treat the slot as acked - the round trip itself
 * completed, the disagreement is a separate concern. */
static bool pending_edit_try_ack(uint32_t body_id, uint32_t tile_idx,
                                   uint16_t depth, uint16_t block_seen) {
    int found = -1;
    uint64_t oldest_t = 0;
    for (int i = 0; i < NET_PENDING_EDITS_MAX; ++i) {
        if (C.pending_edits[i].sent_time == 0) continue;
        if (C.pending_edits[i].body_id  != body_id)  continue;
        if (C.pending_edits[i].tile_idx != tile_idx) continue;
        if (C.pending_edits[i].depth    != depth)    continue;
        if (found < 0 || C.pending_edits[i].sent_time < oldest_t) {
            found = i;
            oldest_t = C.pending_edits[i].sent_time;
        }
    }
    if (found < 0) return false;
    double rtt_ms = stm_sec(stm_diff(stm_now(), C.pending_edits[found].sent_time)) * 1000.0;
    uint16_t expected = C.pending_edits[found].expected_block;
    uint8_t  kind     = C.pending_edits[found].cmd_kind;
    uint32_t seq      = C.pending_edits[found].seq;
    if (block_seen != expected) {
        fprintf(stderr,
                "[net-client] WARN: EDIT seq=%u %s body=%u tile=%u depth=%u: "
                "expected block=%u, server applied block=%u (server overrode)\n",
                seq, edit_kind_name(kind), body_id, tile_idx, depth,
                (unsigned)expected, (unsigned)block_seen);
    } else {
        printf("[net-client] EDIT-ACK seq=%u %s body=%u tile=%u depth=%u block=%u rtt=%.1fms\n",
               seq, edit_kind_name(kind), body_id, tile_idx, depth,
               (unsigned)block_seen, rtt_ms);
    }
    C.pending_edits[found].sent_time = 0;
    ++C.edits_acked_total;
    return true;
}

static void pending_edit_check_timeouts(void) {
    /* Linear scan; capped at NET_PENDING_EDITS_MAX (=128). Cheap. */
    if (C.state != NET_CLIENT_READY) return;
    uint64_t now = stm_now();
    for (int i = 0; i < NET_PENDING_EDITS_MAX; ++i) {
        if (C.pending_edits[i].sent_time == 0) continue;
        double age = stm_sec(stm_diff(now, C.pending_edits[i].sent_time));
        if (age < NET_EDIT_ACK_TIMEOUT_S) continue;
        ++C.edits_timed_out_total;
        fprintf(stderr,
                "[net-client] ERROR: EDIT seq=%u %s body=%u tile=%u depth=%u block=%u "
                "NOT ACKED after %.1fs - server dropped this edit; it WILL be missing on next login. "
                "(stats: sent=%u acked=%u timed_out=%u)\n",
                C.pending_edits[i].seq,
                edit_kind_name(C.pending_edits[i].cmd_kind),
                C.pending_edits[i].body_id,
                C.pending_edits[i].tile_idx,
                (unsigned)C.pending_edits[i].depth,
                (unsigned)C.pending_edits[i].expected_block,
                age,
                C.edits_sent_total, C.edits_acked_total, C.edits_timed_out_total);
        C.pending_edits[i].sent_time = 0;
    }
}

void net_client_send_edit(int kind, uint32_t body_id,
                            int tile, int depth, int block_type) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (tile < 0 || depth < 0) return;
    msg_player_cmd_t cmd = {
        .cmd_kind    = (uint8_t)kind,
        .reserved8a  = 0,
        .reserved16a = 0,
        .body_id     = body_id,
        .tile_idx    = (uint32_t)tile,
        .depth       = (uint16_t)depth,
        .block_type  = (uint16_t)block_type,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_CMD_WIRE_SIZE];
    size_t n = proto_write_player_cmd(buf, sizeof buf, &cmd);
    if (n == 0) return;

    /* Push into the ack table BEFORE sending so a fast loopback echo
     * can't outrun the bookkeeping. Survival BREAK uses BLOCK_AIR as
     * the expected value (matches what the server forces), even though
     * the wire field is ignored on BREAK - keeps the ack-match path
     * uniform. */
    uint32_t seq = ++C.next_edit_seq;
    int slot = pending_edit_alloc_slot();
    if (slot < 0) {
        fprintf(stderr,
                "[net-client] ERROR: pending-edit table full (cap=%d) - "
                "cannot track EDIT seq=%u %s body=%u tile=%u depth=%u. "
                "Round-trip ack will not fire for this edit.\n",
                NET_PENDING_EDITS_MAX, seq, edit_kind_name((uint8_t)kind),
                body_id, (unsigned)tile, (unsigned)depth);
    } else {
        uint16_t expected = (kind == PLAYER_CMD_BREAK)
            ? 0  /* BLOCK_AIR */
            : (uint16_t)block_type;
        C.pending_edits[slot].body_id        = body_id;
        C.pending_edits[slot].tile_idx       = (uint32_t)tile;
        C.pending_edits[slot].depth          = (uint16_t)depth;
        C.pending_edits[slot].expected_block = expected;
        C.pending_edits[slot].cmd_kind       = (uint8_t)kind;
        C.pending_edits[slot].sent_time      = stm_now();
        C.pending_edits[slot].seq            = seq;
    }
    ++C.edits_sent_total;
    printf("[net-client] EDIT-SEND seq=%u %s body=%u tile=%u depth=%u block=%u\n",
           seq, edit_kind_name((uint8_t)kind), body_id,
           (unsigned)tile, (unsigned)depth, (unsigned)block_type);

    /* Reliable channel — block edits are ordered & cannot be dropped. */
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

void net_client_send_torch(bool place_op, uint32_t body_id, int tile_idx,
                             float pos_x, float pos_y, float pos_z,
                             float up_x,  float up_y,  float up_z) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (tile_idx < 0) return;
    msg_torch_diff_t diff = { 0 };
    diff.body_id     = body_id;
    diff.entry_count = 1;
    diff.entries[0].op       = place_op ? TORCH_OP_PLACE : TORCH_OP_REMOVE;
    diff.entries[0].tile_idx = (uint32_t)tile_idx;
    diff.entries[0].pos_x = pos_x; diff.entries[0].pos_y = pos_y; diff.entries[0].pos_z = pos_z;
    diff.entries[0].up_x  = up_x;  diff.entries[0].up_y  = up_y;  diff.entries[0].up_z  = up_z;
    uint8_t buf[MSG_HEADER_SIZE + MSG_TORCH_DIFF_HEADER + MSG_TORCH_ENTRY_SIZE];
    size_t n = proto_write_torch_diff(buf, sizeof buf, &diff);
    if (n == 0) return;
    printf("[net-client] TORCH-SEND %s body=%u tile=%d pos=(%.2f,%.2f,%.2f)\n",
           place_op ? "PLACE" : "REMOVE", body_id, tile_idx,
           pos_x, pos_y, pos_z);
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

void net_client_send_inventory_state(const uint16_t* slot_type,
                                        const int16_t* slot_count,
                                        int selected) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    if (!slot_type || !slot_count) return;
    msg_inventory_state_t inv = { .player_id = 0 };
    memcpy(inv.slot_type,  slot_type,  sizeof inv.slot_type);
    memcpy(inv.slot_count, slot_count, sizeof inv.slot_count);
    inv.selected = (selected >= 0 && selected < 9) ? (uint8_t)selected : 0;
    uint8_t buf[MSG_HEADER_SIZE + MSG_INVENTORY_STATE_WIRE_SIZE];
    size_t n = proto_write_inventory_state(buf, sizeof buf, &inv);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
}

bool net_client_take_pending_inventory(uint16_t* out_slot_type,
                                          int16_t* out_slot_count,
                                          int* out_selected) {
    if (!C.inv_pending) return false;
    if (out_slot_type)  memcpy(out_slot_type,  C.inv_slot_type,
                               sizeof C.inv_slot_type);
    if (out_slot_count) memcpy(out_slot_count, C.inv_slot_count,
                               sizeof C.inv_slot_count);
    if (out_selected)   *out_selected = C.inv_selected;
    C.inv_pending = false;
    return true;
}

void net_client_send_player_state(uint32_t client_tick,
                                    uint32_t body_id,
                                    double pos_x, double pos_y, double pos_z,
                                    float yaw, float pitch,
                                    bool grounded) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    msg_player_state_t st = {
        .client_tick = client_tick,
        .body_id     = body_id,
        .pos_x       = pos_x,
        .pos_y       = pos_y,
        .pos_z       = pos_z,
        .yaw         = yaw,
        .pitch       = pitch,
        .buttons     = 0,
        .flags       = grounded ? PLAYER_STATE_FLAG_GROUNDED : 0,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_STATE_WIRE_SIZE];
    size_t n = proto_write_player_state(buf, sizeof buf, &st);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_UNRELIABLE, buf, n);
}

static void on_close(net_conn_t* conn, net_close_reason_t reason, void* user) {
    (void)conn; (void)user;
    printf("[net-client] socket closed (reason=%d, state=%d)\n",
           (int)reason, (int)C.state);
    /* Manual disconnect path: net_client_disconnect already set
     * state=IDLE and zeroed C.conn before this async close callback
     * fired. Promoting that to ERROR here would (a) leak a stale
     * "lost connection to server" into error_message that the menu
     * later reads on the next MP attempt, and (b) put the client
     * into a state that doesn't reflect what the user did
     * (intentional quit, not a failure). Stay in IDLE. */
    if (C.state == NET_CLIENT_IDLE) {
        return;
    }
    /* Pick a message based on whether the handshake had completed. A
     * close before READY means we never reached the server (refused,
     * DNS, blocked); after READY means the link dropped mid-session. */
    const char* msg;
    if (C.state == NET_CLIENT_READY) {
        msg = "lost connection to server";
    } else if (reason == NET_CLOSE_TIMEOUT) {
        msg = "connection timed out";
    } else if (reason == NET_CLOSE_PROTOCOL_ERR) {
        msg = "could not reach server";
    } else {
        msg = "server is unreachable";
    }
    snprintf(C.error_message, sizeof C.error_message, "%s", msg);
    C.state = NET_CLIENT_ERROR;
    /* Null the conn so a follow-up net_client_connect (auto-reconnect
     * path) doesn't early-return on the stale handle. The transport
     * already owns the close; we just drop our pointer. */
    C.conn = NULL;
}

/* ------------------------------------------------------------------ */
/* Public surface.                                                     */
/* ------------------------------------------------------------------ */

void net_client_connect(const char* url) {
    if (!url) return;
    if (C.conn) return;     /* already connected / connecting */

    /* Preserve the profile/room set by net_client_set_profile across
     * the state reset. The memset below clears every field of C; if
     * we don't snapshot these first, HELLO ships an empty name and
     * the server falls back to 'guest-N' even when the player has
     * a real profile selected. */
    char saved_token[sizeof C.profile_token];
    char saved_name [sizeof C.profile_name];
    char saved_room [sizeof C.room_code];
    memcpy(saved_token, C.profile_token, sizeof saved_token);
    memcpy(saved_name,  C.profile_name,  sizeof saved_name);
    memcpy(saved_room,  C.room_code,     sizeof saved_room);

    /* Release per-body tile bitsets from any prior session before the
     * memset wipes the pointers. Each calloc is the size of the body's
     * tile_count / 8 so cumulative across reconnects this would grow
     * without bound otherwise. */
    for (int s = 0; s < C.body_coverage_count; ++s) {
        free(C.body_coverage[s].tile_bits);
        C.body_coverage[s].tile_bits = NULL;
    }

    memset(&C, 0, sizeof C);
    C.state = NET_CLIENT_CONNECTING;
    memcpy(C.profile_token, saved_token, sizeof C.profile_token);
    memcpy(C.profile_name,  saved_name,  sizeof C.profile_name);
    memcpy(C.room_code,     saved_room,  sizeof C.room_code);

    net_callbacks_t cb = {
        .on_open  = on_open,
        .on_msg   = on_msg,
        .on_close = on_close,
        .user     = NULL,
    };
    C.conn = net_connect(url, cb);
    if (!C.conn) {
        fprintf(stderr, "[net-client] net_connect(%s) failed\n", url);
        snprintf(C.error_message, sizeof C.error_message,
                 "could not start connection");
        C.state = NET_CLIENT_ERROR;
        return;
    }
    /* Stash for the /saves audit so we know which origin to GET from.
     * The audit converts the ws/wss scheme to http/https when it
     * builds the request URL. */
    snprintf(C.server_url, sizeof C.server_url, "%s", url);
    printf("[net-client] connecting to %s\n", url);
}

/* ------------------------------------------------------------------ */
/* /saves audit.
 *
 * After CHUNK_DIFF replays settle, fetch the server's /saves endpoint
 * and verify every (body, tile) the server says it has on disk is
 * also present in our received-tiles bitset. Tiles within
 * NET_AUDIT_NEAR_RADIUS_M of the player are flagged as ERRORs (the
 * missing blocks would be visible from where the player stands);
 * misses outside that radius are summarised so a 160k-tile planet's
 * far side doesn't drown the console.
 *
 * Fetch lives in the JS half because the C side has no HTTP client
 * - sockets-only via libwebsockets in native, browser-side WS in
 * WASM. Re-using fetch() in the browser is cheap and avoids dragging
 * in another transport. Native builds skip the audit (the audit's
 * a debugging tool aimed at the deployed Fly server, not headless
 * test environments). */

static void net_client_run_saves_audit(const char* json);
static bool match_key(const char** p, const char* end, const char* key);
static long parse_long(const char** p, const char* end);

#ifdef __EMSCRIPTEN__
/* Re-entry from the JS fetch promise. EMSCRIPTEN_KEEPALIVE prevents
 * dead-code elimination of an export the wasm linker would otherwise
 * strip. */
EMSCRIPTEN_KEEPALIVE
void net_client_saves_audit_cb(const char* json) {
    if (!json) return;
    net_client_run_saves_audit(json);
}

EM_JS(void, net_client_js_fetch_saves, (const char* url_cstr), {
    var url = UTF8ToString(url_cstr);
    fetch(url)
        .then(function(r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.text();
        })
        .then(function(t) {
            var len = lengthBytesUTF8(t) + 1;
            var ptr = _malloc(len);
            stringToUTF8(t, ptr, len);
            Module.ccall('net_client_saves_audit_cb',
                         'void', ['number'], [ptr]);
            _free(ptr);
        })
        .catch(function(e) {
            console.error('[net-client] /saves fetch failed:', e);
        });
});
#else
static void net_client_js_fetch_saves(const char* url_cstr) {
    /* No HTTP client in the native build. The audit fires from
     * net_client_tick which only invokes this on production where
     * the WASM client is the active code path; leaving as a no-op
     * keeps the unit/integration build green. */
    (void)url_cstr;
}
#endif

static void maybe_trigger_saves_audit(void) {
    if (C.audit_triggered) return;
    if (C.state != NET_CLIENT_READY) return;
    if (C.ready_time == 0) return;
    double ready_age = stm_sec(stm_diff(stm_now(), C.ready_time));
    double quiet_for = stm_sec(stm_diff(stm_now(), C.last_chunk_diff_time));
    if (ready_age < NET_AUDIT_MIN_READY_S) return;
    if (quiet_for < NET_AUDIT_QUIET_S) return;

    /* Build the HTTP origin from the stashed WS url. wss:// -> https://,
     * ws:// -> http://. Anything else leaves the scheme untouched. */
    char url[256];
    const char* base = C.server_url;
    if (strncmp(base, "wss://", 6) == 0) {
        snprintf(url, sizeof url, "https://%s", base + 6);
    } else if (strncmp(base, "ws://", 5) == 0) {
        snprintf(url, sizeof url, "http://%s",  base + 5);
    } else {
        snprintf(url, sizeof url, "%s", base);
    }
    /* Strip trailing slash so the path joins cleanly. */
    size_t ulen = strlen(url);
    if (ulen > 0 && url[ulen - 1] == '/') url[ulen - 1] = 0;
    /* Append /saves[?room=X]. Empty room code = lobby; the server's
     * filter treats no-room as "every room" so we pass __public__
     * explicitly when we're in the lobby. */
    char fetch_url[400];
    if (C.room_code[0]) {
        snprintf(fetch_url, sizeof fetch_url, "%s/saves?room=%s",
                 url, C.room_code);
    } else {
        snprintf(fetch_url, sizeof fetch_url, "%s/saves?room=__public__", url);
    }
    printf("[net-client] AUDIT: fetching %s\n", fetch_url);
    C.audit_triggered = true;
    net_client_js_fetch_saves(fetch_url);
}

/* Minimal JSON scan: walk forward looking for "key" and then ":"
 * followed by an integer. Returns the integer; sets *p past the
 * digits. Tolerant of whitespace and the surrounding comma/quote
 * noise our /saves format uses but doesn't try to be a general
 * parser - the response is fixed-shape so this gets us through. */
static bool match_key(const char** p, const char* end, const char* key) {
    /* Match "key": with arbitrary whitespace around the colon. */
    size_t klen = strlen(key);
    if (*p + klen + 3 >= end) return false;
    if ((*p)[0] != '"') return false;
    if (memcmp(*p + 1, key, klen) != 0) return false;
    if ((*p)[1 + klen] != '"') return false;
    const char* q = *p + 2 + klen;
    while (q < end && (*q == ' ' || *q == '\t' || *q == ':')) ++q;
    *p = q;
    return true;
}

static long parse_long(const char** p, const char* end) {
    while (*p < end && (**p == ' ' || **p == '\t')) ++(*p);
    char* eptr = NULL;
    long v = strtol(*p, &eptr, 10);
    if (eptr) *p = eptr;
    (void)end;
    return v;
}

static void net_client_run_saves_audit(const char* json) {
    if (!json) return;
    size_t json_len = strlen(json);
    const char* p   = json;
    const char* end = json + json_len;

    /* Find the "tiles":[ ... ] section. */
    const char* tiles_start = strstr(json, "\"tiles\"");
    if (!tiles_start) {
        fprintf(stderr, "[net-client] AUDIT: /saves response missing 'tiles' array\n");
        return;
    }
    const char* arr_open = strchr(tiles_start, '[');
    if (!arr_open) {
        fprintf(stderr, "[net-client] AUDIT: malformed /saves response\n");
        return;
    }
    p = arr_open + 1;

    dvec3_t  player_pos     = tenebris_get_local_player_pos();
    uint32_t player_body_id = tenebris_get_local_player_body_id();

    int total_in_saves = 0;
    int total_received = 0;
    int near_missing   = 0;
    int far_missing    = 0;
    /* Distance histogram of missing tiles for the final summary.
     * Buckets are chosen to be readable on a planet-scale walk:
     * within 50 m = "I'd notice on screen right now", within 250 m =
     * "next few seconds of walking", within 1 km = "the nearby
     * chunks", beyond = "far side of the planet, only matters if
     * the player teleports". */
    int miss_within_50m   = 0;
    int miss_within_250m  = 0;
    int miss_within_1km   = 0;
    int miss_beyond_1km   = 0;
    int miss_unknown_dist = 0;     /* on a body the player isn't on */
    /* Per-body running counters for the summary line. */
    struct {
        uint32_t body_id;
        int saved;
        int received;
        int near_missing;
        int total_missing;
    } per_body[NET_BODY_COVERAGE_MAX] = { 0 };
    int per_body_count = 0;

    while (p < end) {
        /* Find the next object opening brace. End of array exits. */
        while (p < end && *p != '{' && *p != ']') ++p;
        if (p >= end || *p == ']') break;
        const char* obj_end = strchr(p, '}');
        if (!obj_end || obj_end >= end) break;

        long seed = 0, body = -1, tile = -1;
        char room_buf[16];
        room_buf[0] = 0;
        (void)seed;

        /* Walk fields inside the object. */
        const char* q = p + 1;
        while (q < obj_end) {
            while (q < obj_end && (*q == ' ' || *q == ',' || *q == '\t')) ++q;
            if (q >= obj_end) break;
            if (match_key(&q, obj_end, "room")) {
                /* "room":"XXX" - grab the string. */
                while (q < obj_end && *q != '"') ++q;
                if (q < obj_end) {
                    ++q;
                    int o = 0;
                    while (q < obj_end && *q != '"'
                            && o + 1 < (int)sizeof room_buf) {
                        room_buf[o++] = *q++;
                    }
                    room_buf[o] = 0;
                }
            } else if (match_key(&q, obj_end, "body")) {
                body = parse_long(&q, obj_end);
            } else if (match_key(&q, obj_end, "tile")) {
                tile = parse_long(&q, obj_end);
            } else {
                /* Skip the value for keys we don't care about - jump
                 * past the comma or to the end of the object. */
                while (q < obj_end && *q != ',' && *q != '}') ++q;
            }
        }
        p = obj_end + 1;

        if (body < 0 || tile < 0) continue;
        ++total_in_saves;

        /* Find the body coverage slot. */
        int slot = -1;
        for (int s = 0; s < C.body_coverage_count; ++s) {
            if (C.body_coverage[s].body_id == (uint32_t)body) { slot = s; break; }
        }
        bool received = false;
        if (slot >= 0 && C.body_coverage[slot].tile_bits
            && tile < C.body_coverage[slot].world_tile_count) {
            int byte = (int)(tile >> 3);
            if (byte < C.body_coverage[slot].tile_bits_bytes) {
                received = (C.body_coverage[slot].tile_bits[byte]
                             & (uint8_t)(1u << (tile & 7))) != 0;
            }
        }
        if (received) ++total_received;

        /* Per-body accumulator. */
        int pb = -1;
        for (int s = 0; s < per_body_count; ++s) {
            if (per_body[s].body_id == (uint32_t)body) { pb = s; break; }
        }
        if (pb < 0 && per_body_count < NET_BODY_COVERAGE_MAX) {
            pb = per_body_count++;
            per_body[pb].body_id = (uint32_t)body;
        }
        if (pb >= 0) {
            ++per_body[pb].saved;
            if (received) ++per_body[pb].received;
            else          ++per_body[pb].total_missing;
        }

        /* Distance check - only meaningful when (a) we know the player
         * body, (b) this tile belongs to that body, and (c) we can
         * resolve the tile center via goldberg. */
        if (!received) {
            double dist_m = -1.0;
            if (player_body_id == (uint32_t)body) {
                world_t* w = renderer_world_for_body((uint32_t)body);
                if (w && w->body && w->grid) {
                    const goldberg_tile_t* gt = goldberg_tile(w->grid, (int)tile);
                    if (gt) {
                        dvec3_t center_dir = dvec3_make(gt->center.x,
                                                          gt->center.y,
                                                          gt->center.z);
                        dvec3_t tile_world = dvec3_make(
                            w->body->pos_x + center_dir.x * w->body->radius_m,
                            w->body->pos_y + center_dir.y * w->body->radius_m,
                            w->body->pos_z + center_dir.z * w->body->radius_m);
                        double dx = tile_world.x - player_pos.x;
                        double dy = tile_world.y - player_pos.y;
                        double dz = tile_world.z - player_pos.z;
                        dist_m = sqrt(dx*dx + dy*dy + dz*dz);
                    }
                }
            }
            /* Histogram. dist_m < 0 means we couldn't resolve a
             * distance (different body than the player) - bucket
             * it separately so the totals still add up. */
            if (dist_m < 0.0)              ++miss_unknown_dist;
            else if (dist_m <=    50.0)    ++miss_within_50m;
            else if (dist_m <=   250.0)    ++miss_within_250m;
            else if (dist_m <=  1000.0)    ++miss_within_1km;
            else                            ++miss_beyond_1km;

            if (dist_m >= 0.0 && dist_m <= NET_AUDIT_NEAR_RADIUS_M) {
                ++near_missing;
                if (pb >= 0) ++per_body[pb].near_missing;
                /* Per-tile "blocks will appear missing" trace silenced:
                 * the audit's bitset only counts WebSocket CHUNK_DIFFs,
                 * and the join path now pulls authoritative state via
                 * the /saves/body HTTP bulk fetch (which doesn't touch
                 * the bitset). Every tile "received via HTTP" therefore
                 * shows up here as missing, flooding the console with
                 * false negatives. Restore from git if a real CHUNK_DIFF
                 * loss needs investigating. */
                /* fprintf(stderr,
                 *         "[net-client] AUDIT MISS body=%ld tile=%ld room='%s' "
                 *         "distance=%.1fm - persisted on server but no CHUNK_DIFF "
                 *         "received, blocks will appear missing\n",
                 *         body, tile, room_buf, dist_m); */
            } else {
                ++far_missing;
                if (pb >= 0 && dist_m >= 0.0
                    && dist_m <= NET_AUDIT_NEAR_RADIUS_M * 4.0) {
                    /* Within 4x near-radius - log so the operator
                     * has some signal without listing every tile on
                     * the far side of a planet. Silenced for the same
                     * reason as the near-miss line above. */
                    /* fprintf(stderr,
                     *         "[net-client] AUDIT MISS (distant) body=%ld tile=%ld "
                     *         "room='%s' distance=%.1fm\n",
                     *         body, tile, room_buf, dist_m); */
                }
            }
        }
    }

    /* End-of-audit summary. The user-facing question is: how many of
     * the server's persisted edits failed to reach me, and where are
     * they relative to where I'm standing? Three blocks of output:
     *   1. Headline counts (totals + missing).
     *   2. Distance histogram of the missing tiles.
     *   3. Per-body breakdown with body name, on-server count,
     *      received count, total missing, and a one-line verdict. */
    int total_missing = total_in_saves - total_received;
    printf("\n[net-client] ====== AUDIT SUMMARY ======\n");
    printf("[net-client] /saves      = %d tile(s) on server\n", total_in_saves);
    printf("[net-client] received    = %d tile(s) in client's CHUNK_DIFF set\n",
           total_received);
    printf("[net-client] missing     = %d tile(s) (%.1f%%) - persisted on server but never sent to client\n",
           total_missing,
           total_in_saves > 0
               ? 100.0 * (double)total_missing / (double)total_in_saves
               : 0.0);
    if (total_missing > 0) {
        printf("[net-client] missing distance histogram (from player at body=%u):\n",
               player_body_id);
        printf("[net-client]   <=50 m     : %d\n", miss_within_50m);
        printf("[net-client]   <=250 m    : %d\n", miss_within_250m);
        printf("[net-client]   <=1 km     : %d\n", miss_within_1km);
        printf("[net-client]   >1 km      : %d\n", miss_beyond_1km);
        printf("[net-client]   other body : %d  (can't compute distance from this player)\n",
               miss_unknown_dist);
    }
    printf("[net-client] per-body:\n");
    for (int i = 0; i < per_body_count; ++i) {
        world_t* w = renderer_world_for_body(per_body[i].body_id);
        const char* name = (w && w->body && w->body->name)
                             ? w->body->name : "?";
        const char* verdict =
            per_body[i].total_missing == 0
                ? "OK - every persisted tile was replayed"
                : "MISSING CHUNK_DIFFs - server has tiles it never sent";
        printf("[net-client]   body=%u (%-10s): %d saved, %d received, "
               "missing %d CHUNK_DIFFs - %s\n",
               per_body[i].body_id, name,
               per_body[i].saved, per_body[i].received,
               per_body[i].total_missing,
               verdict);
    }
    printf("[net-client] ====== END AUDIT SUMMARY ======\n");
    fflush(stdout);
}

/* ------------------------------------------------------------------ */
/* /saves/body lazy-per-body fetch.
 *
 * The WS CHUNK_DIFF replay turned out to be unreliable at scale: a
 * planet with hundreds of persisted columns drops messages on the
 * way down. The HTTP route is TCP-with-retransmits and is the source
 * of truth at boot. We fetch one body at a time, on demand:
 *   - WELCOME -> fetch the spawn body
 *   - body_load_detail (renderer) -> fetch the body about to be meshed
 * Both routes go through net_client_fetch_body_saves which dedupes
 * via the per-body fetch-state slot.
 *
 * Format of the binary response (matches saves.h SAVES_BODY_BLOB):
 *   u8[4]  magic = 'TBOD'
 *   u32    version = 1
 *   u32    body_id
 *   u64    seed
 *   u32    tile_count
 *   u32    depth
 *   { u32 tile_idx, u8[depth] blocks } * tile_count
 * ------------------------------------------------------------------ */

#define SAVES_BODY_BLOB_MAGIC_LE  0x444F4254u   /* 'T' 'B' 'O' 'D' little-endian */
#define SAVES_BODY_BLOB_HEADER    28

static void net_client_apply_body_blob(uint32_t expected_body_id,
                                         const uint8_t* data, size_t len);

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
void net_client_body_blob_cb(uint32_t body_id, const uint8_t* data,
                                int len) {
    if (len <= 0 || !data) {
        fprintf(stderr,
                "[net-client] /saves/body body=%u: empty response (len=%d)\n",
                body_id, len);
        /* Mark idle again so a retry has a chance. */
        for (int i = 0; i < C.body_fetch_count; ++i) {
            if (C.body_fetch[i].body_id == body_id) {
                C.body_fetch[i].state = 0;
                break;
            }
        }
        return;
    }
    net_client_apply_body_blob(body_id, data, (size_t)len);
}

EM_JS(void, net_client_js_fetch_body, (const char* url_cstr, uint32_t body_id), {
    var url = UTF8ToString(url_cstr);
    fetch(url)
        .then(function(r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.arrayBuffer();
        })
        .then(function(buf) {
            var bytes = new Uint8Array(buf);
            var ptr = _malloc(bytes.length);
            HEAPU8.set(bytes, ptr);
            Module.ccall('net_client_body_blob_cb',
                         'void',
                         ['number', 'number', 'number'],
                         [body_id, ptr, bytes.length]);
            _free(ptr);
        })
        .catch(function(e) {
            console.error('[net-client] /saves/body fetch failed for body=' + body_id + ':', e);
        });
});
#else
static void net_client_js_fetch_body(const char* url_cstr, uint32_t body_id) {
    (void)url_cstr; (void)body_id;
}
#endif

void net_client_fetch_body_saves(uint32_t body_id) {
    if (C.state != NET_CLIENT_READY) {
        /* Pre-READY: stash nothing - the WELCOME path re-issues the
         * fetch for the spawn body once we know the URL anyway. */
        return;
    }
    if (!C.server_url[0]) return;

    /* Dedupe: idle / in-flight / done state per body. Allocate a slot
     * on first call. */
    int slot = -1;
    for (int i = 0; i < C.body_fetch_count; ++i) {
        if (C.body_fetch[i].body_id == body_id) { slot = i; break; }
    }
    if (slot < 0 && C.body_fetch_count < NET_BODY_COVERAGE_MAX) {
        slot = C.body_fetch_count++;
        C.body_fetch[slot].body_id = body_id;
        C.body_fetch[slot].state   = 0;
    }
    if (slot < 0) {
        fprintf(stderr,
                "[net-client] body-fetch table full, can't track body=%u\n",
                body_id);
        return;
    }
    if (C.body_fetch[slot].state != 0) {
        /* Already fetched or in flight; skip. */
        return;
    }
    C.body_fetch[slot].state = 1;

    /* Build the HTTP URL the same way the audit does: ws:// -> http://,
     * wss:// -> https://. */
    char origin[200];
    const char* base = C.server_url;
    if (strncmp(base, "wss://", 6) == 0) {
        snprintf(origin, sizeof origin, "https://%s", base + 6);
    } else if (strncmp(base, "ws://", 5) == 0) {
        snprintf(origin, sizeof origin, "http://%s",  base + 5);
    } else {
        snprintf(origin, sizeof origin, "%s", base);
    }
    size_t olen = strlen(origin);
    if (olen > 0 && origin[olen - 1] == '/') origin[olen - 1] = 0;

    char url[400];
    if (C.room_code[0]) {
        snprintf(url, sizeof url,
                 "%s/saves/body?room=%s&body=%u&seed=%llu",
                 origin, C.room_code, body_id,
                 (unsigned long long)C.welcome.world_seed);
    } else {
        snprintf(url, sizeof url,
                 "%s/saves/body?room=__public__&body=%u&seed=%llu",
                 origin, body_id,
                 (unsigned long long)C.welcome.world_seed);
    }
    printf("[net-client] /saves/body fetch -> %s\n", url);
    net_client_js_fetch_body(url, body_id);
}

void net_client_resync_body_saves(uint32_t body_id) {
    if (C.state != NET_CLIENT_READY) return;
    /* Find the dedup slot and force it back to idle, so the
     * fetch_body_saves call below doesn't bail on "already done".
     * If the body has never been fetched, the call will allocate
     * a slot itself - nothing to reset here. */
    for (int i = 0; i < C.body_fetch_count; ++i) {
        if (C.body_fetch[i].body_id == body_id) {
            /* Don't disturb in-flight fetches - the response will
             * land naturally. Only reset done (state == 2) slots. */
            if (C.body_fetch[i].state == 2) C.body_fetch[i].state = 0;
            break;
        }
    }
    net_client_fetch_body_saves(body_id);
}

static void net_client_apply_body_blob(uint32_t expected_body_id,
                                         const uint8_t* data, size_t len) {
    if (len < SAVES_BODY_BLOB_HEADER) {
        fprintf(stderr,
                "[net-client] body blob too small (%zu bytes) for body=%u\n",
                len, expected_body_id);
        return;
    }
    uint32_t magic, version, body_id_in;
    uint64_t seed;
    uint32_t tile_count, depth;
    memcpy(&magic,      data + 0,  4);
    memcpy(&version,    data + 4,  4);
    memcpy(&body_id_in, data + 8,  4);
    memcpy(&seed,       data + 12, 8);
    memcpy(&tile_count, data + 20, 4);
    memcpy(&depth,      data + 24, 4);
    if (magic != SAVES_BODY_BLOB_MAGIC_LE) {
        fprintf(stderr,
                "[net-client] body blob magic mismatch for body=%u (got 0x%08x, expected 0x%08x)\n",
                expected_body_id, magic, SAVES_BODY_BLOB_MAGIC_LE);
        return;
    }
    if (body_id_in != expected_body_id) {
        fprintf(stderr,
                "[net-client] body blob body_id mismatch (response %u, requested %u)\n",
                body_id_in, expected_body_id);
        /* Trust the response's body_id - the URL might have routed
         * somewhere unexpected and applying to the wrong world would
         * silently corrupt the right one. */
    }

    world_t* w = renderer_world_for_body(body_id_in);
    if (!w) {
        fprintf(stderr,
                "[net-client] body blob body=%u unknown to renderer, %u tile(s) DROPPED\n",
                body_id_in, tile_count);
        return;
    }
    if ((int)depth != WORLD_MAX_DEPTH) {
        fprintf(stderr,
                "[net-client] body blob depth=%u != WORLD_MAX_DEPTH=%d, refusing to apply\n",
                depth, WORLD_MAX_DEPTH);
        return;
    }

    const size_t record_size = 4 + (size_t)depth;
    const uint8_t* cursor = data + SAVES_BODY_BLOB_HEADER;
    const uint8_t* end    = data + len;
    int applied_tiles = 0;
    int applied_cells = 0;
    for (uint32_t i = 0; i < tile_count; ++i) {
        if (cursor + record_size > end) {
            fprintf(stderr,
                    "[net-client] body blob truncated at record %u/%u\n",
                    i, tile_count);
            break;
        }
        uint32_t tile_idx;
        memcpy(&tile_idx, cursor, 4);
        cursor += 4;
        const uint8_t* col = cursor;
        cursor += depth;
        if ((int)tile_idx < 0 || (int)tile_idx >= w->tile_count) continue;
        /* Apply the saved column wholesale. world_set marks the
         * tile + neighbors dirty so the renderer remeshes on the
         * next frame; if the body is already meshed this is a
         * visible refresh, if it isn't (deferred) the bits stick
         * until body_full_mesh runs. */
        for (int d = 0; d < (int)depth; ++d) {
            world_set(w, (int)tile_idx, d, (block_t)col[d]);
            ++applied_cells;
        }
        ++applied_tiles;
    }

    /* Mark the fetch slot done so re-approach skips the refetch. */
    for (int i = 0; i < C.body_fetch_count; ++i) {
        if (C.body_fetch[i].body_id == expected_body_id) {
            C.body_fetch[i].state = 2;
            break;
        }
    }

    const char* name = (w && w->body && w->body->name) ? w->body->name : "?";
    printf("[net-client] /saves/body body=%u (%s) applied: %d tile(s), %d cell(s) "
           "(%zu bytes received)\n",
           body_id_in, name, applied_tiles, applied_cells, len);
    fflush(stdout);
}

void net_client_tick(void) {
    if (C.conn) net_poll_client(C.conn);
    pending_edit_check_timeouts();
    maybe_trigger_saves_audit();
}

void net_client_disconnect(void) {
    if (!C.conn) return;
    net_close(C.conn);
    C.conn  = NULL;
    C.state = NET_CLIENT_IDLE;
}

net_client_state_t          net_client_state  (void) { return C.state; }
bool                        net_client_can_retry(void) { return !C.no_retry; }
const net_client_welcome_t* net_client_welcome(void) { return &C.welcome; }

const char* net_client_error_message(void) {
    return C.error_message[0] ? C.error_message : NULL;
}

net_desync_kind_t net_client_last_desync(double* out_seconds_ago,
                                            uint32_t* out_block_type) {
    if (out_block_type) *out_block_type = C.last_desync_block;
    if (out_seconds_ago) {
        *out_seconds_ago = (C.last_desync_time == 0)
            ? -1.0
            : stm_sec(stm_diff(stm_now(), C.last_desync_time));
    }
    return C.last_desync;
}
