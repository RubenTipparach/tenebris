/* Byte-compat harness for the server/saves.c -> Rust port.
 *
 * Compiled by the Rust test in crates/tenebris-server/src/saves.rs
 * against the REAL tenebris-c sources (saves.c + the full core stack)
 * with the same gcc used for the world/water pins.
 *
 * Modes (argv[1]):
 *   write <dir>  - saves_init(dir), build a Tenebris subdiv-3 world,
 *                  write a scripted save tree (tiles, water, origins,
 *                  torches, players, chat/session logs, hand-rolled
 *                  v0/corrupt/lenient-name fixtures) and print the
 *                  expected read-back state as key=value lines.
 *   read <dir>   - saves_init(dir), build the same world, load
 *                  everything back and print the observed state with
 *                  the same keys.
 *
 * The Rust test asserts (a) write-mode and read-mode outputs agree,
 * (b) the Rust port reading the C tree produces the same values,
 * (c) a Rust-written tree is byte-identical file-by-file, and
 * (d) this harness in read mode accepts the Rust-written tree.
 *
 * `dir` should be a RELATIVE path (the harness is spawned with cwd
 * set to the scratch dir) so mkdir_p never has to create a Windows
 * drive-letter component. */
#include "server/saves.h"
#include "core/blocks.h"
#include "core/planet.h"
#include "core/world.h"
#include "core/world_water.h"

#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define ROOM     "ABC123"
#define SEED     0xDEADBEEFull
#define SEED_HEX "deadbeef"

static void die(const char* msg) {
    fprintf(stderr, "HARNESS DIE: %s\n", msg);
    exit(3);
}

/* ---- FNV-1a-64, the same canonical hash the Rust tests use ---- */
static void fnv_acc(uint64_t* h, const void* p, size_t n) {
    const uint8_t* b = (const uint8_t*)p;
    for (size_t i = 0; i < n; ++i) { *h ^= b[i]; *h *= 1099511628211ull; }
}
static uint64_t fnv_init(void) { return 14695981039346656037ull; }

static uint64_t hash_blocks(const world_t* w) {
    uint64_t h = fnv_init();
    fnv_acc(&h, w->blocks, (size_t)w->tile_count * WORLD_MAX_DEPTH);
    return h;
}

static uint64_t hash_water(const world_t* w) {
    uint64_t h = fnv_init();
    for (int t = 0; t < w->tile_count; ++t) {
        const uint8_t* col = world_water_state_column(w, t);
        fnv_acc(&h, col, WORLD_MAX_DEPTH);
    }
    return h;
}

/* Order-independent: sort enum entries by depth, hash only the live
 * origin slots. */
static uint64_t hash_origins_tile(const world_t* w, int tile) {
    water_origin_diff_entry_t e[WORLD_MAX_DEPTH];
    int n = world_water_origin_enum_tile(w, tile, e, WORLD_MAX_DEPTH);
    if (n > WORLD_MAX_DEPTH) n = WORLD_MAX_DEPTH;
    for (int i = 1; i < n; ++i) {        /* insertion sort by depth */
        water_origin_diff_entry_t key = e[i];
        int j = i - 1;
        while (j >= 0 && e[j].depth > key.depth) { e[j + 1] = e[j]; --j; }
        e[j + 1] = key;
    }
    uint64_t h = fnv_init();
    for (int i = 0; i < n; ++i) {
        fnv_acc(&h, &e[i].depth, 1);
        fnv_acc(&h, &e[i].origin_count, 1);
        int c = e[i].origin_count;
        if (c > WATER_ORIGIN_MAX) c = WATER_ORIGIN_MAX;
        for (int k = 0; k < c; ++k) {
            fnv_acc(&h, &e[i].origin_tile[k], 4);
            fnv_acc(&h, &e[i].origin_depth[k], 1);
        }
    }
    return h;
}

static uint64_t hash_torches(const saves_torch_t* t, int n) {
    uint64_t h = fnv_init();
    for (int i = 0; i < n; ++i) {
        fnv_acc(&h, &t[i].tile_idx, 4);
        fnv_acc(&h, &t[i].pos[0], 4);
        fnv_acc(&h, &t[i].pos[1], 4);
        fnv_acc(&h, &t[i].pos[2], 4);
        fnv_acc(&h, &t[i].up[0], 4);
        fnv_acc(&h, &t[i].up[1], 4);
        fnv_acc(&h, &t[i].up[2], 4);
    }
    return h;
}

static uint64_t hash_player(const saves_player_pose_t* p) {
    uint64_t h = fnv_init();
    fnv_acc(&h, &p->version, 4);
    fnv_acc(&h, &p->body_id, 4);
    fnv_acc(&h, &p->pos_x, 8);
    fnv_acc(&h, &p->pos_y, 8);
    fnv_acc(&h, &p->pos_z, 8);
    fnv_acc(&h, &p->yaw, 4);
    fnv_acc(&h, &p->pitch, 4);
    for (int i = 0; i < SAVES_PLAYER_INVENTORY_SLOTS; ++i)
        fnv_acc(&h, &p->inv_slot_type[i], 2);
    for (int i = 0; i < SAVES_PLAYER_INVENTORY_SLOTS; ++i)
        fnv_acc(&h, &p->inv_slot_count[i], 2);
    fnv_acc(&h, &p->inv_selected, 1);
    fnv_acc(&h, p->inv_reserved, 3);
    return h;
}

static uint64_t hash_backlog(const saves_chat_msg_t* m, int n) {
    uint64_t h = fnv_init();
    for (int i = 0; i < n; ++i) {
        fnv_acc(&h, m[i].name, strlen(m[i].name));
        fnv_acc(&h, "|", 1);
        fnv_acc(&h, m[i].text, strlen(m[i].text));
        fnv_acc(&h, "\n", 1);
    }
    return h;
}

/* enumerate_tiles visitor: XOR-combine one FNV per entry so the hash
 * is independent of directory walk order. mtime is excluded (it
 * differs between the C-written and Rust-written trees). */
typedef struct { uint64_t acc; int count; } enum_acc_t;
static void enum_visit(const char* room, uint64_t seed, uint32_t body_id,
                       int tile_idx, size_t size_bytes, uint64_t mtime,
                       void* user) {
    (void)mtime;
    enum_acc_t* a = (enum_acc_t*)user;
    uint64_t h = fnv_init();
    uint8_t z = 0;
    uint64_t sz = (uint64_t)size_bytes;
    fnv_acc(&h, room, strlen(room));
    fnv_acc(&h, &z, 1);
    fnv_acc(&h, &seed, 8);
    fnv_acc(&h, &body_id, 4);
    fnv_acc(&h, &tile_idx, 4);
    fnv_acc(&h, &sz, 8);
    a->acc ^= h;
    a->count += 1;
}

/* sessions.log field hash: per line, skip everything through the
 * first tab (the timestamp differs run to run), hash the rest + \n. */
static void hash_sessions(uint64_t* h_out, int* lines_out) {
    static char buf[64 * 1024];
    size_t n = saves_audit_tail("sessions", 1000, buf, sizeof buf);
    uint64_t h = fnv_init();
    int lines = 0;
    size_t i = 0;
    while (i < n) {
        size_t j = i;
        while (j < n && buf[j] != '\n') ++j;
        size_t k = i;
        while (k < j && buf[k] != '\t') ++k;
        if (k < j) ++k;                 /* skip the tab itself */
        fnv_acc(&h, buf + k, j - k);
        fnv_acc(&h, "\n", 1);
        ++lines;
        i = (j < n) ? j + 1 : n;
    }
    *h_out = h;
    *lines_out = lines;
}

/* ---- scripted content (mirrored verbatim by the Rust test) ---- */

static void fill_pattern(world_t* w, int tile, int mul, int add) {
    for (int d = 0; d < WORLD_MAX_DEPTH; ++d)
        w->blocks[(size_t)tile * WORLD_MAX_DEPTH + d] =
            (uint8_t)((d * mul + add) & 0xFF);
}

static void scripted_torches(saves_torch_t* t) {
    t[0].tile_idx = 42;
    t[0].pos[0] = 1.5f;     t[0].pos[1] = -2.25f;     t[0].pos[2] = 3.125f;
    t[0].up[0]  = 0.0f;     t[0].up[1]  = 1.0f;       t[0].up[2]  = 0.0f;
    t[1].tile_idx = 77;
    t[1].pos[0] = -0.001f;  t[1].pos[1] = 12345.678f; t[1].pos[2] = -9.5f;
    t[1].up[0]  = 0.70710678f; t[1].up[1] = 0.0f;     t[1].up[2]  = -0.70710678f;
    t[2].tile_idx = 9;
    t[2].pos[0] = 0.0f;     t[2].pos[1] = 0.0f;       t[2].pos[2] = 0.0f;
    t[2].up[0]  = 0.0f;     t[2].up[1]  = 0.0f;       t[2].up[2]  = 1.0f;
}

static void scripted_pose_a(saves_player_pose_t* p) {
    memset(p, 0, sizeof *p);
    p->version = 0;            /* writer stamps SAVES_PLAYER_VERSION */
    p->body_id = 0;
    p->pos_x = 1234.5678901234567;
    p->pos_y = -0.000123456789;
    p->pos_z = 9876543.25;
    p->yaw   = 1.25f;
    p->pitch = -0.25f;
    uint16_t types[9]  = { 1, 2, 3, 0, 5, 0, 7, 8, 9 };
    int16_t  counts[9] = { 10, -1, 32767, 0, 5, 0, 64, 1, 99 };
    memcpy(p->inv_slot_type, types, sizeof types);
    memcpy(p->inv_slot_count, counts, sizeof counts);
    p->inv_selected = 4;
}

static void scripted_pose_b(saves_player_pose_t* p) {
    memset(p, 0, sizeof *p);
    p->body_id = 2;
    p->pos_x = -1.5;
    p->pos_y = 2.5;
    p->pos_z = -3.5;
    p->yaw   = 0.5f;
    p->pitch = 0.125f;
    p->inv_slot_type[0]  = 4;
    p->inv_slot_count[0] = 7;
}

static void write_raw(const char* dir, const char* rel,
                      const uint8_t* data, size_t n) {
    char path[700];
    snprintf(path, sizeof path, "%s/%s", dir, rel);
    FILE* f = fopen(path, "wb");
    if (!f) die("fixture fopen failed");
    if (fwrite(data, 1, n, f) != n) die("fixture fwrite failed");
    fclose(f);
}

/* Hand-rolled fixtures, byte-mirrored on the Rust side:
 *   200.col   legacy v0: 128 raw bytes (d*3+1)
 *   201.col   corrupt: 64 bytes of 0xAB (readers leave a partial
 *             overlay on tile 201's first 64 bytes, then skip it -
 *             that quirk is intentionally pinned)
 *   99zz.col  valid v1 payload under a sloppy name; the loader's
 *             atoi() parse files it under tile 99
 *   legacy.dat 40-byte v1 player record (no inventory tail)          */
static void write_fixtures(const char* dir) {
    uint8_t v0[WORLD_MAX_DEPTH];
    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) v0[d] = (uint8_t)((d * 3 + 1) & 0xFF);
    write_raw(dir, "rooms/" ROOM "/world-" SEED_HEX "/body-0/200.col",
              v0, sizeof v0);

    uint8_t bad[64];
    memset(bad, 0xAB, sizeof bad);
    write_raw(dir, "rooms/" ROOM "/world-" SEED_HEX "/body-0/201.col",
              bad, sizeof bad);

    uint8_t v1[SAVES_TILE_HEADER_SIZE + WORLD_MAX_DEPTH];
    uint32_t magic = SAVES_TILE_MAGIC, ver = SAVES_TILE_VERSION;
    uint32_t depth = WORLD_MAX_DEPTH, rsv = 0;
    memcpy(v1 + 0, &magic, 4);
    memcpy(v1 + 4, &ver, 4);
    memcpy(v1 + 8, &depth, 4);
    memcpy(v1 + 12, &rsv, 4);
    for (int d = 0; d < WORLD_MAX_DEPTH; ++d)
        v1[SAVES_TILE_HEADER_SIZE + d] = (uint8_t)((d * 5 + 2) & 0xFF);
    write_raw(dir, "rooms/" ROOM "/world-" SEED_HEX "/body-0/99zz.col",
              v1, sizeof v1);

    uint8_t pv1[40];
    uint32_t pver = 1, pbody = 3;
    double px = 1.0, py = 2.0, pz = 3.0;
    float yaw = 0.5f, pitch = -0.5f;
    memcpy(pv1 + 0, &pver, 4);
    memcpy(pv1 + 4, &pbody, 4);
    memcpy(pv1 + 8, &px, 8);
    memcpy(pv1 + 16, &py, 8);
    memcpy(pv1 + 24, &pz, 8);
    memcpy(pv1 + 32, &yaw, 4);
    memcpy(pv1 + 36, &pitch, 4);
    write_raw(dir, "rooms/" ROOM "/players/legacy.dat", pv1, sizeof pv1);
}

static world_t* build_world(void) {
    const body_config_t* body = planet_get(BODY_TENEBRIS);
    world_t* w = world_create(body, 3);
    while (!world_gen_complete(w)) world_stream_gen(w, 100);
    return w;
}

static void apply_scripted_edits(world_t* w) {
    /* tile 5: deterministic pattern; tiles 7 + 123 stay at the gen
     * baseline (still a real persistence test - the column round-trips
     * through disk). */
    fill_pattern(w, 5, 7, 155);

    /* water-flow state on tile 9, depths 40..55 */
    for (int d = 40; d < 56; ++d) {
        uint8_t s = (uint8_t)((((d & 1) ? 0x80 : 0x40)) | (uint8_t)(d % 7));
        world_water_set_state(w, 9, d, s);
    }

    /* flow origins on tile 7 */
    water_origin_ref_t r;
    r.tile = 6;  r.depth = 39; world_water_origin_add(w, 7, 40, r);
    r.tile = 8;  r.depth = 41; world_water_origin_add(w, 7, 40, r);
    r.tile = 7;  r.depth = 40; world_water_origin_add(w, 7, 41, r);
    r.tile = 5;  r.depth = 54; world_water_origin_add(w, 7, 55, r);
    r.tile = 6;  r.depth = 54; world_water_origin_add(w, 7, 55, r);
    r.tile = 8;  r.depth = 54; world_water_origin_add(w, 7, 55, r);
}

static void print_shared_expectations(world_t* w) {
    printf("blocks_hash=%" PRIu64 "\n", hash_blocks(w));
    printf("water_hash=%" PRIu64 "\n", hash_water(w));
    printf("orig7_hash=%" PRIu64 "\n", hash_origins_tile(w, 7));

    saves_torch_t t[3];
    scripted_torches(t);
    printf("torch_hash=%" PRIu64 "\n", hash_torches(t, 3));

    saves_player_pose_t pa, pb, pl;
    scripted_pose_a(&pa);
    pa.version = SAVES_PLAYER_VERSION;
    printf("player_hash=%" PRIu64 "\n", hash_player(&pa));
    scripted_pose_b(&pb);
    pb.version = SAVES_PLAYER_VERSION;
    printf("player_pub_hash=%" PRIu64 "\n", hash_player(&pb));
    memset(&pl, 0, sizeof pl);
    pl.version = 1;
    pl.body_id = 3;
    pl.pos_x = 1.0; pl.pos_y = 2.0; pl.pos_z = 3.0;
    pl.yaw = 0.5f;  pl.pitch = -0.5f;
    printf("legacy_hash=%" PRIu64 "\n", hash_player(&pl));

    saves_chat_msg_t msgs[2];
    snprintf(msgs[0].name, sizeof msgs[0].name, "Bob");
    snprintf(msgs[0].text, sizeof msgs[0].text, "hi there x");
    snprintf(msgs[1].name, sizeof msgs[1].name, "Bob");
    snprintf(msgs[1].text, sizeof msgs[1].text, "second message");
    printf("backlog_count=2\n");
    printf("backlog_hash=%" PRIu64 "\n", hash_backlog(msgs, 2));
    saves_chat_msg_t pubm[1];
    snprintf(pubm[0].name, sizeof pubm[0].name, "Alice");
    snprintf(pubm[0].text, sizeof pubm[0].text, "hello world");
    printf("backlog_pub_count=1\n");
    printf("backlog_pub_hash=%" PRIu64 "\n", hash_backlog(pubm, 1));

    /* sessions.log after the read-time orphan sweep: the three logged
     * events plus the synthetic logout for Alice's unpaired login. */
    const char* lines[4] = {
        "login\tAlice\t__public__\n",
        "login\tBob\t" ROOM "\n",
        "logout\tBob\t" ROOM "\n",
        "logout\tAlice\t__public__\n",
    };
    uint64_t sh = fnv_init();
    for (int i = 0; i < 4; ++i) fnv_acc(&sh, lines[i], strlen(lines[i]));
    printf("sessions_lines=4\n");
    printf("sessions_hash=%" PRIu64 "\n", sh);
}

static void print_disk_views(void) {
    static uint8_t blob[1 << 20];
    size_t blob_len = 0;
    if (!saves_body_blob(ROOM, SEED, 0, blob, sizeof blob, &blob_len))
        die("body_blob failed");
    uint64_t bh = fnv_init();
    fnv_acc(&bh, blob, blob_len);
    printf("blob_len=%zu\n", blob_len);
    printf("blob_hash=%" PRIu64 "\n", bh);

    enum_acc_t ea = { fnv_init(), 0 };
    int total = saves_enumerate_tiles(enum_visit, &ea);
    printf("enum_count=%d\n", total);
    printf("enum_hash=%" PRIu64 "\n", ea.acc);

    printf("has_edits_b0=%d\n", saves_room_body_has_edits(ROOM, SEED, 0) ? 1 : 0);
    printf("has_edits_b9=%d\n", saves_room_body_has_edits(ROOM, SEED, 9) ? 1 : 0);
}

static int mode_write(const char* dir) {
    if (!saves_init(dir)) die("saves_init failed");
    world_t* w = build_world();
    apply_scripted_edits(w);

    if (!saves_write_tile(w, ROOM, SEED, 5))   die("write_tile 5");
    if (!saves_write_tile(w, ROOM, SEED, 7))   die("write_tile 7");
    if (!saves_write_tile(w, ROOM, SEED, 123)) die("write_tile 123");
    if (!saves_write_water_state(w, ROOM, SEED, 9)) die("write_water 9");
    if (!saves_write_water_origins(w, ROOM, SEED, 7)) die("write_origins 7");
    printf("zero_orig_ok=%d\n", saves_write_water_origins(w, ROOM, SEED, 8) ? 1 : 0);

    saves_torch_t t[3];
    scripted_torches(t);
    if (!saves_torches_write(ROOM, SEED, 0, t, 3)) die("torches_write");
    printf("torches_empty_ok=%d\n", saves_torches_write(ROOM, SEED, 1, NULL, 0) ? 1 : 0);

    saves_player_pose_t pa, pb;
    scripted_pose_a(&pa);
    scripted_pose_b(&pb);
    if (!saves_write_player(ROOM, "Ruben Tipparach", &pa)) die("write_player a");
    if (!saves_write_player("", "Alice", &pb))             die("write_player b");
    printf("sanit_reject=%d\n", saves_write_player(ROOM, "???", &pa) ? 1 : 0);

    write_fixtures(dir);

    saves_session_log("login", "Alice", "");
    saves_session_log("login", "Bob", ROOM);
    saves_session_log("logout", "Bob", ROOM);
    saves_global_chat_append("", "Alice", "hello world");
    saves_global_chat_append(ROOM, "Bob", "hi\tthere\nx");
    saves_chat_append(ROOM, "Bob", "second message");

    /* Mirror the on-disk overlays the read path will apply so the
     * shared hashes below are computed on the exact expected state:
     * v0 fixture on tile 200, lenient-name v1 on tile 99, and the
     * corrupt 64-byte file's partial overlay on tile 201. */
    fill_pattern(w, 200, 3, 1);
    fill_pattern(w, 99, 5, 2);
    for (int d = 0; d < 64; ++d)
        w->blocks[(size_t)201 * WORLD_MAX_DEPTH + d] = 0xAB;

    print_shared_expectations(w);
    print_disk_views();
    printf("harness_ok=1\n");
    return 0;
}

static int mode_read(const char* dir) {
    if (!saves_init(dir)) die("saves_init failed");
    world_t* w = build_world();

    int loaded = saves_load_world(w, ROOM, SEED);
    printf("loaded_cols=%d\n", loaded);
    int wn = saves_load_world_water(w, ROOM, SEED);
    printf("water_loaded=%d\n", wn);
    int on = saves_load_world_water_origins(w, ROOM, SEED);
    printf("orig_tiles=%d\n", on);

    printf("blocks_hash=%" PRIu64 "\n", hash_blocks(w));
    printf("water_hash=%" PRIu64 "\n", hash_water(w));
    printf("orig7_hash=%" PRIu64 "\n", hash_origins_tile(w, 7));

    saves_torch_t t[SAVES_TORCHES_MAX_COUNT];
    int tn = saves_torches_load(ROOM, SEED, 0, t, SAVES_TORCHES_MAX_COUNT);
    printf("torches_loaded=%d\n", tn);
    printf("torch_hash=%" PRIu64 "\n", hash_torches(t, tn));
    printf("torches_b1=%d\n", saves_torches_load(ROOM, SEED, 1, t, SAVES_TORCHES_MAX_COUNT));

    saves_player_pose_t p;
    printf("player_ok=%d\n", saves_load_player(ROOM, "Ruben Tipparach", &p) ? 1 : 0);
    printf("player_hash=%" PRIu64 "\n", hash_player(&p));
    saves_player_pose_t pc;
    printf("caseins_ok=%d\n", saves_load_player(ROOM, "RUBEN tipparach", &pc) ? 1 : 0);
    saves_player_pose_t pb;
    printf("player_pub_ok=%d\n", saves_load_player("", "Alice", &pb) ? 1 : 0);
    printf("player_pub_hash=%" PRIu64 "\n", hash_player(&pb));
    saves_player_pose_t pl;
    printf("legacy_ok=%d\n", saves_load_player(ROOM, "Legacy", &pl) ? 1 : 0);
    printf("legacy_hash=%" PRIu64 "\n", hash_player(&pl));
    saves_player_pose_t pm;
    printf("missing_ok=%d\n", saves_load_player(ROOM, "Nobody", &pm) ? 1 : 0);

    saves_chat_msg_t msgs[SAVES_CHAT_BACKLOG];
    int bc = saves_chat_load_backlog(ROOM, msgs, SAVES_CHAT_BACKLOG);
    printf("backlog_count=%d\n", bc);
    printf("backlog_hash=%" PRIu64 "\n", hash_backlog(msgs, bc));
    int pc2 = saves_chat_load_backlog("", msgs, SAVES_CHAT_BACKLOG);
    printf("backlog_pub_count=%d\n", pc2);
    printf("backlog_pub_hash=%" PRIu64 "\n", hash_backlog(msgs, pc2));

    uint64_t sh;
    int slines;
    hash_sessions(&sh, &slines);
    printf("sessions_lines=%d\n", slines);
    printf("sessions_hash=%" PRIu64 "\n", sh);

    print_disk_views();
    printf("harness_ok=1\n");
    return 0;
}

int main(int argc, char** argv) {
    if (argc != 3) die("usage: saves_harness write|read <dir>");
    if (strcmp(argv[1], "write") == 0) return mode_write(argv[2]);
    if (strcmp(argv[1], "read") == 0)  return mode_read(argv[2]);
    die("unknown mode");
    return 1;
}
