#include "server/saves.h"
#include "core/blocks.h"
#include "core/world.h"

#include <dirent.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

static const char* G_saves_dir = NULL;

/* ----------------------------------------------------------------- */
/* mkdir -p helper. Builds intermediate dirs walking the path. */
static bool mkdir_p(const char* path) {
    char buf[512];
    size_t len = strnlen(path, sizeof buf - 1);
    if (len == 0) return false;
    memcpy(buf, path, len);
    buf[len] = 0;
    for (size_t i = 1; i <= len; ++i) {
        if (i == len || buf[i] == '/') {
            char saved = buf[i];
            buf[i] = 0;
            if (mkdir(buf, 0755) != 0 && errno != EEXIST) {
                fprintf(stderr, "[saves] mkdir(%s) failed: %s\n",
                        buf, strerror(errno));
                return false;
            }
            buf[i] = saved;
        }
    }
    return true;
}

static bool write_atomic(const char* path, const void* data, size_t len) {
    char tmp[512];
    snprintf(tmp, sizeof tmp, "%s.tmp", path);
    FILE* f = fopen(tmp, "wb");
    if (!f) { fprintf(stderr, "[saves] fopen %s: %s\n", tmp, strerror(errno)); return false; }
    size_t n = fwrite(data, 1, len, f);
    int closed = fclose(f);
    if (n != len || closed != 0) {
        unlink(tmp);
        return false;
    }
    if (rename(tmp, path) != 0) {
        fprintf(stderr, "[saves] rename %s -> %s: %s\n",
                tmp, path, strerror(errno));
        unlink(tmp);
        return false;
    }
    return true;
}

/* ----------------------------------------------------------------- */
/* Public surface                                                     */
/* ----------------------------------------------------------------- */

bool saves_init(const char* saves_dir) {
    if (!saves_dir || !*saves_dir) return false;
    G_saves_dir = saves_dir;
    if (!mkdir_p(saves_dir)) return false;
    char players[512];
    snprintf(players, sizeof players, "%s/players", saves_dir);
    if (!mkdir_p(players)) return false;
    printf("[saves] init dir=%s\n", saves_dir);
    return true;
}

void saves_shutdown(void) {
    G_saves_dir = NULL;
}

static void body_dir(char* out, size_t cap, uint64_t seed, uint32_t body_id) {
    snprintf(out, cap, "%s/world-%llx/body-%u",
             G_saves_dir, (unsigned long long)seed, (unsigned)body_id);
}

static void tile_path(char* out, size_t cap, uint64_t seed,
                        uint32_t body_id, int tile_idx) {
    snprintf(out, cap, "%s/world-%llx/body-%u/%d.col",
             G_saves_dir, (unsigned long long)seed,
             (unsigned)body_id, tile_idx);
}

bool saves_write_tile(world_t* w, uint64_t seed, int tile_idx) {
    if (!G_saves_dir || !w || !w->body) return false;
    if (tile_idx < 0 || tile_idx >= w->tile_count) return false;
    char dir[512];
    body_dir(dir, sizeof dir, seed, (uint32_t)w->body->id);
    if (!mkdir_p(dir)) return false;
    char path[512];
    tile_path(path, sizeof path, seed, (uint32_t)w->body->id, tile_idx);
    const uint8_t* col = &w->blocks[(size_t)tile_idx * WORLD_MAX_DEPTH];
    return write_atomic(path, col, WORLD_MAX_DEPTH);
}

int saves_flush_world(world_t* w, uint64_t seed) {
    if (!G_saves_dir || !w) return 0;
    int written = 0;
    for (int tile = 0; tile < w->tile_count; ++tile) {
        if (!world_tile_dirty(w, tile)) continue;
        if (saves_write_tile(w, seed, tile)) {
            world_tile_clear_dirty(w, tile);
            ++written;
        }
    }
    return written;
}

int saves_load_world(world_t* w, uint64_t seed) {
    if (!G_saves_dir || !w || !w->body) return 0;
    char dir[512];
    body_dir(dir, sizeof dir, seed, (uint32_t)w->body->id);
    DIR* d = opendir(dir);
    if (!d) return 0;     /* no saves yet — silent skip */
    int loaded = 0;
    struct dirent* e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        const char* dot = strrchr(e->d_name, '.');
        if (!dot || strcmp(dot, ".col") != 0) continue;
        int tile = atoi(e->d_name);
        if (tile < 0 || tile >= w->tile_count) continue;
        char path[512];
        snprintf(path, sizeof path, "%s/%s", dir, e->d_name);
        FILE* f = fopen(path, "rb");
        if (!f) continue;
        uint8_t* col = &w->blocks[(size_t)tile * WORLD_MAX_DEPTH];
        size_t n = fread(col, 1, WORLD_MAX_DEPTH, f);
        fclose(f);
        if (n == WORLD_MAX_DEPTH) ++loaded;
    }
    closedir(d);
    if (loaded > 0) {
        printf("[saves] body=%u: restored %d tile column(s) from %s\n",
               (unsigned)w->body->id, loaded, dir);
    }
    return loaded;
}

/* ----------------------------------------------------------------- */
/* Per-player pose                                                    */
/* ----------------------------------------------------------------- */

static bool token_is_valid(const char* tok) {
    if (!tok || !*tok) return false;
    size_t len = strlen(tok);
    if (len > 64) return false;
    for (size_t i = 0; i < len; ++i) {
        char c = tok[i];
        if (!((c >= '0' && c <= '9') ||
              (c >= 'a' && c <= 'f') ||
              (c >= 'A' && c <= 'F') ||
              c == '-' || c == '_')) return false;
    }
    return true;
}

static void player_path(char* out, size_t cap, const char* token) {
    snprintf(out, cap, "%s/players/%s.dat", G_saves_dir, token);
}

bool saves_write_player(const char* token, const saves_player_pose_t* pose) {
    if (!G_saves_dir || !pose || !token_is_valid(token)) return false;
    char path[512];
    player_path(path, sizeof path, token);
    /* On-disk layout matches the in-memory struct; both server and
     * future loader see the same C ABI. Bump SAVES_PLAYER_VERSION
     * when fields shift. */
    saves_player_pose_t out = *pose;
    out.version = SAVES_PLAYER_VERSION;
    return write_atomic(path, &out, sizeof out);
}

bool saves_load_player(const char* token, saves_player_pose_t* out) {
    if (!G_saves_dir || !out || !token_is_valid(token)) return false;
    char path[512];
    player_path(path, sizeof path, token);
    FILE* f = fopen(path, "rb");
    if (!f) return false;
    saves_player_pose_t buf;
    size_t n = fread(&buf, 1, sizeof buf, f);
    fclose(f);
    if (n != sizeof buf) return false;
    if (buf.version != SAVES_PLAYER_VERSION) {
        fprintf(stderr, "[saves] player %s: version %u != %u, ignoring\n",
                token, buf.version, SAVES_PLAYER_VERSION);
        return false;
    }
    *out = buf;
    return true;
}
