#include "core/proto.h"
#include <string.h>

/* Explicit little-endian encoders / decoders. Host byte order is not
 * assumed — most targets we ship to are LE (x86, ARM in LE mode,
 * WASM), but doing this by hand means the wire format is portable to
 * any future host without surprises. */

static void put_u16_le(uint8_t* b, uint16_t v) {
    b[0] = (uint8_t)(v & 0xFF);
    b[1] = (uint8_t)((v >> 8) & 0xFF);
}

static void put_u32_le(uint8_t* b, uint32_t v) {
    b[0] = (uint8_t)(v & 0xFF);
    b[1] = (uint8_t)((v >> 8) & 0xFF);
    b[2] = (uint8_t)((v >> 16) & 0xFF);
    b[3] = (uint8_t)((v >> 24) & 0xFF);
}

static void put_u64_le(uint8_t* b, uint64_t v) {
    for (int i = 0; i < 8; ++i) b[i] = (uint8_t)((v >> (8 * i)) & 0xFF);
}

static uint16_t get_u16_le(const uint8_t* b) {
    return (uint16_t)b[0] | ((uint16_t)b[1] << 8);
}

static uint32_t get_u32_le(const uint8_t* b) {
    return (uint32_t)b[0]
         | ((uint32_t)b[1] << 8)
         | ((uint32_t)b[2] << 16)
         | ((uint32_t)b[3] << 24);
}

static uint64_t get_u64_le(const uint8_t* b) {
    uint64_t v = 0;
    for (int i = 0; i < 8; ++i) v |= (uint64_t)b[i] << (8 * i);
    return v;
}

/* IEEE-754 doubles are bit-identical on every target we ship — copy
 * the bits through a uint64 to keep the encode endian-explicit. */
static void put_f64_le(uint8_t* b, double v) {
    uint64_t bits;
    memcpy(&bits, &v, sizeof bits);
    put_u64_le(b, bits);
}

static double get_f64_le(const uint8_t* b) {
    uint64_t bits = get_u64_le(b);
    double v;
    memcpy(&v, &bits, sizeof v);
    return v;
}

/* ------------------------------------------------------------------ */

size_t proto_write_header(uint8_t* buf, msg_kind_t kind, uint16_t version,
                            uint32_t payload_len) {
    put_u16_le(buf + 0, (uint16_t)kind);
    put_u16_le(buf + 2, version);
    put_u32_le(buf + 4, payload_len);
    return MSG_HEADER_SIZE;
}

int proto_read_header(const uint8_t* buf, size_t len, msg_hdr_t* out) {
    if (len < MSG_HEADER_SIZE) return -1;
    out->kind    = get_u16_le(buf + 0);
    out->version = get_u16_le(buf + 2);
    out->length  = get_u32_le(buf + 4);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_hello(uint8_t* buf, size_t cap, const msg_hello_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_HELLO_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_HELLO, MSG_HELLO_VERSION, MSG_HELLO_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->client_version);
    memcpy   (p + 4, m->token, MSG_HELLO_TOKEN_LEN);
    memcpy   (p + 4 + MSG_HELLO_TOKEN_LEN, m->name, MSG_HELLO_NAME_LEN);
    memcpy   (p + 4 + MSG_HELLO_TOKEN_LEN + MSG_HELLO_NAME_LEN,
                m->room_code, MSG_HELLO_ROOM_LEN);
    put_u32_le(p + 4 + MSG_HELLO_TOKEN_LEN + MSG_HELLO_NAME_LEN + MSG_HELLO_ROOM_LEN,
                 m->reserved);
    return total;
}

int proto_read_hello(const uint8_t* payload, size_t len, msg_hello_t* out) {
    if (len < MSG_HELLO_WIRE_SIZE) return -1;
    out->client_version = get_u32_le(payload + 0);
    memcpy(out->token,     payload + 4, MSG_HELLO_TOKEN_LEN);
    memcpy(out->name,      payload + 4 + MSG_HELLO_TOKEN_LEN, MSG_HELLO_NAME_LEN);
    memcpy(out->room_code, payload + 4 + MSG_HELLO_TOKEN_LEN + MSG_HELLO_NAME_LEN,
             MSG_HELLO_ROOM_LEN);
    out->reserved = get_u32_le(payload + 4 + MSG_HELLO_TOKEN_LEN + MSG_HELLO_NAME_LEN + MSG_HELLO_ROOM_LEN);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_player_info(uint8_t* buf, size_t cap,
                                 const msg_player_info_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_PLAYER_INFO, MSG_PLAYER_INFO_VERSION,
                         MSG_PLAYER_INFO_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->player_id);
    memcpy   (p + 4, m->name, MSG_PLAYER_INFO_NAME_LEN);
    put_u32_le(p + 4 + MSG_PLAYER_INFO_NAME_LEN, m->reserved);
    return total;
}

int proto_read_player_info(const uint8_t* payload, size_t len,
                             msg_player_info_t* out) {
    if (len < MSG_PLAYER_INFO_WIRE_SIZE) return -1;
    out->player_id = get_u32_le(payload + 0);
    memcpy(out->name, payload + 4, MSG_PLAYER_INFO_NAME_LEN);
    out->reserved  = get_u32_le(payload + 4 + MSG_PLAYER_INFO_NAME_LEN);
    return 0;
}

size_t proto_write_player_info_request(uint8_t* buf, size_t cap,
                                          const msg_player_info_request_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_PLAYER_INFO_REQUEST_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_PLAYER_INFO_REQUEST,
                         MSG_PLAYER_INFO_REQUEST_VERSION,
                         MSG_PLAYER_INFO_REQUEST_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->player_id);
    put_u32_le(p + 4, m->reserved);
    return total;
}

int proto_read_player_info_request(const uint8_t* payload, size_t len,
                                      msg_player_info_request_t* out) {
    if (len < MSG_PLAYER_INFO_REQUEST_WIRE_SIZE) return -1;
    out->player_id = get_u32_le(payload + 0);
    out->reserved  = get_u32_le(payload + 4);
    return 0;
}

size_t proto_write_player_info_nack(uint8_t* buf, size_t cap,
                                       const msg_player_info_nack_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_PLAYER_INFO_NACK_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_PLAYER_INFO_NACK,
                         MSG_PLAYER_INFO_NACK_VERSION,
                         MSG_PLAYER_INFO_NACK_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->player_id);
    put_u32_le(p + 4, m->reason);
    return total;
}

int proto_read_player_info_nack(const uint8_t* payload, size_t len,
                                   msg_player_info_nack_t* out) {
    if (len < MSG_PLAYER_INFO_NACK_WIRE_SIZE) return -1;
    out->player_id = get_u32_le(payload + 0);
    out->reason    = get_u32_le(payload + 4);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_chat(uint8_t* buf, size_t cap, const msg_chat_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_CHAT, MSG_CHAT_VERSION, MSG_CHAT_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->player_id);
    memcpy   (p + 4, m->text, MSG_CHAT_TEXT_LEN);
    put_u32_le(p + 4 + MSG_CHAT_TEXT_LEN, m->reserved);
    return total;
}

int proto_read_chat(const uint8_t* payload, size_t len, msg_chat_t* out) {
    if (len < MSG_CHAT_WIRE_SIZE) return -1;
    out->player_id = get_u32_le(payload + 0);
    memcpy(out->text, payload + 4, MSG_CHAT_TEXT_LEN);
    out->reserved  = get_u32_le(payload + 4 + MSG_CHAT_TEXT_LEN);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_welcome(uint8_t* buf, size_t cap, const msg_welcome_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_WELCOME_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_WELCOME, MSG_WELCOME_VERSION, MSG_WELCOME_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0,  m->player_id);
    put_u64_le(p + 4,  m->world_seed);
    put_f64_le(p + 12, m->spawn_x);
    put_f64_le(p + 20, m->spawn_y);
    put_f64_le(p + 28, m->spawn_z);
    put_u32_le(p + 36, m->body_id);
    /* yaw / pitch as IEEE-754 bits through uint32 for endian safety. */
    uint32_t yb, pb;
    memcpy(&yb, &m->spawn_yaw,   sizeof yb);
    memcpy(&pb, &m->spawn_pitch, sizeof pb);
    put_u32_le(p + 40, yb);
    put_u32_le(p + 44, pb);
    return total;
}

int proto_read_welcome(const uint8_t* payload, size_t len, msg_welcome_t* out) {
    if (len < MSG_WELCOME_WIRE_SIZE) return -1;
    out->player_id   = get_u32_le(payload + 0);
    out->world_seed  = get_u64_le(payload + 4);
    out->spawn_x     = get_f64_le(payload + 12);
    out->spawn_y     = get_f64_le(payload + 20);
    out->spawn_z     = get_f64_le(payload + 28);
    out->body_id     = get_u32_le(payload + 36);
    uint32_t yb = get_u32_le(payload + 40);
    uint32_t pb = get_u32_le(payload + 44);
    memcpy(&out->spawn_yaw,   &yb, sizeof out->spawn_yaw);
    memcpy(&out->spawn_pitch, &pb, sizeof out->spawn_pitch);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_player_state(uint8_t* buf, size_t cap,
                                  const msg_player_state_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_PLAYER_STATE_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_PLAYER_STATE, MSG_PLAYER_STATE_VERSION,
                         MSG_PLAYER_STATE_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0,  m->client_tick);
    put_u32_le(p + 4,  m->body_id);
    put_f64_le(p + 8,  m->pos_x);
    put_f64_le(p + 16, m->pos_y);
    put_f64_le(p + 24, m->pos_z);
    /* IEEE-754 float bits through uint32 for endian-explicit copy. */
    uint32_t yb, pb;
    memcpy(&yb, &m->yaw,   sizeof yb);
    memcpy(&pb, &m->pitch, sizeof pb);
    put_u32_le(p + 32, yb);
    put_u32_le(p + 36, pb);
    put_u16_le(p + 40, m->buttons);
    put_u16_le(p + 42, m->reserved);
    return total;
}

int proto_read_player_state(const uint8_t* payload, size_t len,
                              msg_player_state_t* out) {
    if (len < MSG_PLAYER_STATE_WIRE_SIZE) return -1;
    out->client_tick = get_u32_le(payload + 0);
    out->body_id     = get_u32_le(payload + 4);
    out->pos_x       = get_f64_le(payload + 8);
    out->pos_y       = get_f64_le(payload + 16);
    out->pos_z       = get_f64_le(payload + 24);
    uint32_t yb = get_u32_le(payload + 32);
    uint32_t pb = get_u32_le(payload + 36);
    memcpy(&out->yaw,   &yb, sizeof out->yaw);
    memcpy(&out->pitch, &pb, sizeof out->pitch);
    out->buttons  = get_u16_le(payload + 40);
    out->reserved = get_u16_le(payload + 42);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_snapshot(uint8_t* buf, size_t cap, const msg_snapshot_t* m) {
    if (!m) return 0;
    uint16_t n = m->player_count;
    if (n > SNAPSHOT_MAX_PLAYERS) n = SNAPSHOT_MAX_PLAYERS;
    const size_t payload_len = MSG_SNAPSHOT_HEADER_SIZE
                               + (size_t)n * MSG_SNAPSHOT_ENTRY_SIZE;
    const size_t total = MSG_HEADER_SIZE + payload_len;
    if (cap < total) return 0;

    proto_write_header(buf, MSG_SNAPSHOT, MSG_SNAPSHOT_VERSION,
                         (uint32_t)payload_len);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->server_tick);
    put_u16_le(p + 4, n);
    put_u16_le(p + 6, 0);
    p += MSG_SNAPSHOT_HEADER_SIZE;
    for (int i = 0; i < (int)n; ++i) {
        const msg_snapshot_entry_t* e = &m->players[i];
        put_u32_le(p + 0,  e->player_id);
        put_u32_le(p + 4,  e->body_id);
        put_f64_le(p + 8,  e->pos_x);
        put_f64_le(p + 16, e->pos_y);
        put_f64_le(p + 24, e->pos_z);
        uint32_t yb, pb;
        memcpy(&yb, &e->yaw,   sizeof yb);
        memcpy(&pb, &e->pitch, sizeof pb);
        put_u32_le(p + 32, yb);
        put_u32_le(p + 36, pb);
        p += MSG_SNAPSHOT_ENTRY_SIZE;
    }
    return total;
}

size_t proto_write_desync(uint8_t* buf, size_t cap, const msg_desync_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_DESYNC_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_DESYNC, MSG_DESYNC_VERSION, MSG_DESYNC_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0,  m->reason);
    put_u32_le(p + 4,  m->body_id);
    put_f64_le(p + 8,  m->client_pos_x);
    put_f64_le(p + 16, m->client_pos_y);
    put_f64_le(p + 24, m->client_pos_z);
    put_u32_le(p + 32, m->block_type);
    return total;
}

int proto_read_desync(const uint8_t* payload, size_t len, msg_desync_t* out) {
    if (len < MSG_DESYNC_WIRE_SIZE) return -1;
    out->reason       = get_u32_le(payload + 0);
    out->body_id      = get_u32_le(payload + 4);
    out->client_pos_x = get_f64_le(payload + 8);
    out->client_pos_y = get_f64_le(payload + 16);
    out->client_pos_z = get_f64_le(payload + 24);
    out->block_type   = get_u32_le(payload + 32);
    return 0;
}

size_t proto_write_kick(uint8_t* buf, size_t cap, const msg_kick_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_KICK_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_KICK, MSG_KICK_VERSION, MSG_KICK_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->reason);
    memcpy(p + 4, m->text, MSG_KICK_TEXT_LEN);
    put_u32_le(p + 4 + MSG_KICK_TEXT_LEN, m->reserved);
    return total;
}

int proto_read_kick(const uint8_t* payload, size_t len, msg_kick_t* out) {
    if (len < MSG_KICK_WIRE_SIZE) return -1;
    out->reason   = get_u32_le(payload + 0);
    memcpy(out->text, payload + 4, MSG_KICK_TEXT_LEN);
    out->reserved = get_u32_le(payload + 4 + MSG_KICK_TEXT_LEN);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_player_cmd(uint8_t* buf, size_t cap,
                                const msg_player_cmd_t* m) {
    const size_t total = MSG_HEADER_SIZE + MSG_PLAYER_CMD_WIRE_SIZE;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_PLAYER_CMD, MSG_PLAYER_CMD_VERSION,
                         MSG_PLAYER_CMD_WIRE_SIZE);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    p[0] = m->cmd_kind;
    p[1] = m->reserved8a;
    put_u16_le(p + 2,  m->reserved16a);
    put_u32_le(p + 4,  m->body_id);
    put_u32_le(p + 8,  m->tile_idx);
    put_u16_le(p + 12, m->depth);
    put_u16_le(p + 14, m->block_type);
    return total;
}

int proto_read_player_cmd(const uint8_t* payload, size_t len,
                            msg_player_cmd_t* out) {
    if (len < MSG_PLAYER_CMD_WIRE_SIZE) return -1;
    out->cmd_kind     = payload[0];
    out->reserved8a   = payload[1];
    out->reserved16a  = get_u16_le(payload + 2);
    out->body_id      = get_u32_le(payload + 4);
    out->tile_idx     = get_u32_le(payload + 8);
    out->depth        = get_u16_le(payload + 12);
    out->block_type   = get_u16_le(payload + 14);
    return 0;
}

/* ------------------------------------------------------------------ */

size_t proto_write_chunk_diff(uint8_t* buf, size_t cap,
                                const msg_chunk_diff_t* m) {
    if (!m) return 0;
    uint16_t n = m->edit_count;
    if (n > CHUNK_DIFF_MAX_EDITS) n = CHUNK_DIFF_MAX_EDITS;
    const size_t payload_len = MSG_CHUNK_DIFF_HEADER_SIZE
                               + (size_t)n * MSG_CHUNK_DIFF_ENTRY_SIZE;
    const size_t total = MSG_HEADER_SIZE + payload_len;
    if (cap < total) return 0;
    proto_write_header(buf, MSG_CHUNK_DIFF, MSG_CHUNK_DIFF_VERSION,
                         (uint32_t)payload_len);
    uint8_t* p = buf + MSG_HEADER_SIZE;
    put_u32_le(p + 0, m->body_id);
    put_u16_le(p + 4, n);
    put_u16_le(p + 6, 0);
    p += MSG_CHUNK_DIFF_HEADER_SIZE;
    for (int i = 0; i < (int)n; ++i) {
        const msg_chunk_diff_entry_t* e = &m->edits[i];
        put_u32_le(p + 0, e->tile_idx);
        put_u16_le(p + 4, e->depth);
        put_u16_le(p + 6, e->block_type);
        p += MSG_CHUNK_DIFF_ENTRY_SIZE;
    }
    return total;
}

int proto_read_chunk_diff(const uint8_t* payload, size_t len,
                            msg_chunk_diff_t* out) {
    if (len < MSG_CHUNK_DIFF_HEADER_SIZE) return -1;
    out->body_id    = get_u32_le(payload + 0);
    uint16_t n      = get_u16_le(payload + 4);
    if (n > CHUNK_DIFF_MAX_EDITS) return -1;
    if (len < MSG_CHUNK_DIFF_HEADER_SIZE + (size_t)n * MSG_CHUNK_DIFF_ENTRY_SIZE)
        return -1;
    out->edit_count = n;
    const uint8_t* p = payload + MSG_CHUNK_DIFF_HEADER_SIZE;
    for (int i = 0; i < (int)n; ++i) {
        msg_chunk_diff_entry_t* e = &out->edits[i];
        e->tile_idx   = get_u32_le(p + 0);
        e->depth      = get_u16_le(p + 4);
        e->block_type = get_u16_le(p + 6);
        p += MSG_CHUNK_DIFF_ENTRY_SIZE;
    }
    return 0;
}

int proto_read_snapshot(const uint8_t* payload, size_t len,
                          msg_snapshot_t* out) {
    if (len < MSG_SNAPSHOT_HEADER_SIZE) return -1;
    out->server_tick  = get_u32_le(payload + 0);
    uint16_t n        = get_u16_le(payload + 4);
    if (n > SNAPSHOT_MAX_PLAYERS) return -1;
    if (len < MSG_SNAPSHOT_HEADER_SIZE + (size_t)n * MSG_SNAPSHOT_ENTRY_SIZE)
        return -1;
    out->player_count = n;
    const uint8_t* p = payload + MSG_SNAPSHOT_HEADER_SIZE;
    for (int i = 0; i < (int)n; ++i) {
        msg_snapshot_entry_t* e = &out->players[i];
        e->player_id = get_u32_le(p + 0);
        e->body_id   = get_u32_le(p + 4);
        e->pos_x     = get_f64_le(p + 8);
        e->pos_y     = get_f64_le(p + 16);
        e->pos_z     = get_f64_le(p + 24);
        uint32_t yb  = get_u32_le(p + 32);
        uint32_t pb  = get_u32_le(p + 36);
        memcpy(&e->yaw,   &yb, sizeof e->yaw);
        memcpy(&e->pitch, &pb, sizeof e->pitch);
        p += MSG_SNAPSHOT_ENTRY_SIZE;
    }
    return 0;
}
