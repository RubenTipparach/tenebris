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
#include <time.h>
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

/* Manifest: a single 32-byte file at the saves root that captures
 * the on-disk format version of the whole save tree. Read at boot;
 * if missing, written with the current version. If present with a
 * different SAVES_TILE_VERSION, logs a warning so the operator
 * knows about a format drift before a single tile file goes
 * stale. The structure is intentionally fixed-size and additive
 * (only the trailing reserved fields shift) so future versions can
 * carry more metadata without breaking the layout. */
typedef struct {
    uint32_t magic;          /* 'TSAV' = 0x56415354 */
    uint32_t format_version; /* SAVES_TILE_VERSION at write time */
    uint64_t first_seen_at;  /* unix seconds when the dir was first claimed */
    uint8_t  reserved[16];
} saves_manifest_t;

#define SAVES_MANIFEST_MAGIC  0x56415354u

static void manifest_path(char* out, size_t cap) {
    snprintf(out, cap, "%s/manifest.dat", G_saves_dir);
}

static void load_or_write_manifest(void) {
    char path[512];
    manifest_path(path, sizeof path);
    FILE* f = fopen(path, "rb");
    if (f) {
        saves_manifest_t m;
        size_t n = fread(&m, 1, sizeof m, f);
        fclose(f);
        if (n == sizeof m && m.magic == SAVES_MANIFEST_MAGIC) {
            if (m.format_version != SAVES_TILE_VERSION) {
                fprintf(stderr,
                    "[saves] manifest format_version=%u, expected %u - "
                    "on-disk saves predate this build. Legacy tiles "
                    "will be migrated lazily on first write.\n",
                    m.format_version, SAVES_TILE_VERSION);
            } else {
                printf("[saves] manifest ok: format_version=%u first_seen=%llu\n",
                       m.format_version, (unsigned long long)m.first_seen_at);
            }
            return;
        }
        /* Corrupt or wrong magic - fall through to rewrite. */
        fprintf(stderr, "[saves] manifest unreadable, rewriting\n");
    }
    saves_manifest_t m = {
        .magic          = SAVES_MANIFEST_MAGIC,
        .format_version = SAVES_TILE_VERSION,
        .first_seen_at  = 0,
    };
    /* Best-effort timestamp; not safety-critical so a stat failure
     * just leaves it at 0. */
    {
        time_t t = time(NULL);
        if (t > 0) m.first_seen_at = (uint64_t)t;
    }
    write_atomic(path, &m, sizeof m);
    printf("[saves] manifest created: format_version=%u\n", m.format_version);
}

bool saves_init(const char* saves_dir) {
    if (!saves_dir || !*saves_dir) return false;
    G_saves_dir = saves_dir;
    if (!mkdir_p(saves_dir)) return false;
    char players[512];
    snprintf(players, sizeof players, "%s/players", saves_dir);
    if (!mkdir_p(players)) return false;
    load_or_write_manifest();
    printf("[saves] init dir=%s\n", saves_dir);
    return true;
}

void saves_shutdown(void) {
    G_saves_dir = NULL;
}

/* Map an empty / NULL room code to the on-disk placeholder for the
 * public room so the path is always well-formed. */
static const char* room_dir_name(const char* room) {
    return (room && *room) ? room : "__public__";
}

static void body_dir(char* out, size_t cap, const char* room,
                       uint64_t seed, uint32_t body_id) {
    snprintf(out, cap, "%s/rooms/%s/world-%llx/body-%u",
             G_saves_dir, room_dir_name(room),
             (unsigned long long)seed, (unsigned)body_id);
}

static void tile_path(char* out, size_t cap, const char* room,
                        uint64_t seed, uint32_t body_id, int tile_idx) {
    snprintf(out, cap, "%s/rooms/%s/world-%llx/body-%u/%d.col",
             G_saves_dir, room_dir_name(room),
             (unsigned long long)seed,
             (unsigned)body_id, tile_idx);
}

/* Encode the .col file as [16-byte header][WORLD_MAX_DEPTH bytes].
 * Header layout (little-endian):
 *   u32 magic       = SAVES_TILE_MAGIC ('TCOL')
 *   u32 version     = SAVES_TILE_VERSION
 *   u32 depth       = WORLD_MAX_DEPTH (number of column bytes)
 *   u32 reserved    = 0 (kept for future block-id-namespace tags)
 *
 * Magic catches accidental reads of an unrelated file; version
 * gates compatibility; depth lets a future column-height change
 * reject mismatched files instead of silently truncating. */
bool saves_write_tile(world_t* w, const char* room, uint64_t seed, int tile_idx) {
    if (!G_saves_dir || !w || !w->body) return false;
    if (tile_idx < 0 || tile_idx >= w->tile_count) return false;
    char dir[512];
    body_dir(dir, sizeof dir, room, seed, (uint32_t)w->body->id);
    if (!mkdir_p(dir)) return false;
    char path[512];
    tile_path(path, sizeof path, room, seed, (uint32_t)w->body->id, tile_idx);

    uint8_t buf[SAVES_TILE_HEADER_SIZE + WORLD_MAX_DEPTH];
    uint32_t magic = SAVES_TILE_MAGIC;
    uint32_t ver   = SAVES_TILE_VERSION;
    uint32_t depth = WORLD_MAX_DEPTH;
    uint32_t rsv   = 0;
    memcpy(buf + 0,  &magic, 4);
    memcpy(buf + 4,  &ver,   4);
    memcpy(buf + 8,  &depth, 4);
    memcpy(buf + 12, &rsv,   4);
    memcpy(buf + SAVES_TILE_HEADER_SIZE,
           &w->blocks[(size_t)tile_idx * WORLD_MAX_DEPTH],
           WORLD_MAX_DEPTH);
    bool ok = write_atomic(path, buf, sizeof buf);
    /* Track that this tile now has a persisted column so the join-
     * time replay path picks it up on the next client connect. */
    if (ok) world_tile_mark_saved(w, tile_idx);
    return ok;
}

int saves_flush_world(world_t* w, const char* room, uint64_t seed) {
    if (!G_saves_dir || !w) return 0;
    int written = 0;
    for (int tile = 0; tile < w->tile_count; ++tile) {
        if (!world_tile_dirty(w, tile)) continue;
        if (saves_write_tile(w, room, seed, tile)) {
            world_tile_clear_dirty(w, tile);
            ++written;
        }
    }
    return written;
}

int saves_load_world(world_t* w, const char* room, uint64_t seed) {
    if (!G_saves_dir || !w || !w->body) return 0;
    char dir[512];
    body_dir(dir, sizeof dir, room, seed, (uint32_t)w->body->id);
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
        /* Two formats supported:
         *   - Legacy v0: file is exactly WORLD_MAX_DEPTH raw bytes,
         *     no header. Pre-versioning saves on disk.
         *   - v1+: 16-byte header (magic 'TCOL' / version / depth /
         *     reserved) followed by WORLD_MAX_DEPTH bytes.
         * Detect by peeking the first 4 bytes for magic. Anything
         * else: drop the file (corruption or wrong block-id era). */
        uint8_t head[SAVES_TILE_HEADER_SIZE];
        size_t hn = fread(head, 1, sizeof head, f);
        bool accepted = false;
        if (hn == sizeof head) {
            uint32_t magic, ver, depth;
            memcpy(&magic, head + 0, 4);
            memcpy(&ver,   head + 4, 4);
            memcpy(&depth, head + 8, 4);
            if (magic == SAVES_TILE_MAGIC
                && ver <= SAVES_TILE_VERSION
                && depth == WORLD_MAX_DEPTH) {
                size_t cn = fread(col, 1, WORLD_MAX_DEPTH, f);
                accepted = (cn == WORLD_MAX_DEPTH);
            } else if (hn == WORLD_MAX_DEPTH
                       && SAVES_TILE_HEADER_SIZE == WORLD_MAX_DEPTH) {
                /* Defensive: never hit unless WORLD_MAX_DEPTH happens
                 * to equal SAVES_TILE_HEADER_SIZE. Real v0 path is
                 * the size-based branch below. */
                accepted = true;
                memcpy(col, head, WORLD_MAX_DEPTH);
            } else {
                /* Legacy v0: file is exactly 128 bytes, first 16 of
                 * which we already read into `head`. Rewind to start
                 * and refill the column. */
                rewind(f);
                size_t cn = fread(col, 1, WORLD_MAX_DEPTH, f);
                if (cn == WORLD_MAX_DEPTH) {
                    /* If there are extra bytes after the column, the
                     * file is neither v0 nor v1 - reject it. */
                    uint8_t spill;
                    if (fread(&spill, 1, 1, f) == 0) accepted = true;
                }
            }
        }
        fclose(f);
        if (accepted) {
            ++loaded;
            /* Remember that this tile diverges from procgen so the
             * server can replay it to joining clients. */
            world_tile_mark_saved(w, tile);
        } else {
            fprintf(stderr, "[saves] %s: skipped (unknown format)\n", path);
        }
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

/* ----------------------------------------------------------------- */
/* Chat log                                                           */
/* ----------------------------------------------------------------- */

static void room_filename(const char* room, char* out, size_t cap) {
    /* Empty room -> __public__. Otherwise the room code (already
     * sanitised on the wire to A-Z + 2-9) is the filename verbatim. */
    snprintf(out, cap, "%s/chat/%s.log",
             G_saves_dir,
             (room && *room) ? room : "__public__");
}

/* Strip newline / tab from a string in place — they break our line
 * format. Cheap, runs once per chat append. */
static void strip_log_chars(char* s, size_t cap) {
    if (!s) return;
    for (size_t i = 0; i < cap && s[i]; ++i) {
        if (s[i] == '\n' || s[i] == '\r' || s[i] == '\t') s[i] = ' ';
    }
}

void saves_chat_append(const char* room, const char* name, const char* text) {
    if (!G_saves_dir || !name || !text) return;
    char dir[512];
    snprintf(dir, sizeof dir, "%s/chat", G_saves_dir);
    if (!mkdir_p(dir)) return;
    char path[512];
    room_filename(room, path, sizeof path);

    char clean_name[SAVES_CHAT_NAME_MAX + 1];
    char clean_text[SAVES_CHAT_TEXT_MAX + 1];
    snprintf(clean_name, sizeof clean_name, "%s", name);
    snprintf(clean_text, sizeof clean_text, "%s", text);
    strip_log_chars(clean_name, sizeof clean_name);
    strip_log_chars(clean_text, sizeof clean_text);

    /* Append. We rely on POSIX append-mode atomicity — for our
     * single-writer server, chat writes never interleave. */
    FILE* f = fopen(path, "ab");
    if (!f) return;
    fprintf(f, "%s\t%s\n", clean_name, clean_text);
    fclose(f);

    /* Cheap truncation: if the file has gone past SAVES_CHAT_FILE_MAX
     * lines, rewrite it keeping only the last N. We check by reading
     * the whole file (worst case ~30 KB at the cap) and only rewrite
     * when over. */
    f = fopen(path, "rb");
    if (!f) return;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz < 0 || sz > 1024 * 1024) { fclose(f); return; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    /* Count lines. */
    int line_count = 0;
    for (size_t i = 0; i < r; ++i) if (buf[i] == '\n') ++line_count;
    if (line_count <= SAVES_CHAT_FILE_MAX) { free(buf); return; }

    /* Find the start of the (line_count - SAVES_CHAT_FILE_MAX)th
     * line — that's where the kept tail begins. */
    int drop = line_count - SAVES_CHAT_FILE_MAX;
    size_t off = 0;
    int seen = 0;
    while (off < r && seen < drop) {
        if (buf[off] == '\n') ++seen;
        ++off;
    }
    /* Atomic-rewrite via .tmp swap. */
    char tmp[512];
    snprintf(tmp, sizeof tmp, "%s.tmp", path);
    FILE* w = fopen(tmp, "wb");
    if (w) {
        fwrite(buf + off, 1, r - off, w);
        fclose(w);
        rename(tmp, path);
    }
    free(buf);
}

int saves_chat_load_backlog(const char* room,
                              saves_chat_msg_t* out, int cap) {
    if (!G_saves_dir || !out || cap <= 0) return 0;
    char path[512];
    room_filename(room, path, sizeof path);
    FILE* f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz <= 0 || sz > 1024 * 1024) { fclose(f); return 0; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return 0; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    /* Walk lines forward, fill a ring of size `cap`. Then unwrap
     * into `out` so the result is oldest -> newest. */
    saves_chat_msg_t* ring = (saves_chat_msg_t*)calloc((size_t)cap, sizeof(*ring));
    if (!ring) { free(buf); return 0; }
    int head = 0, count = 0;
    char* line = buf;
    while (line < buf + r) {
        char* nl = (char*)memchr(line, '\n', (size_t)(buf + r - line));
        size_t len = nl ? (size_t)(nl - line) : (size_t)(buf + r - line);
        char* tab = (char*)memchr(line, '\t', len);
        if (tab && tab > line && (size_t)(tab - line) <= SAVES_CHAT_NAME_MAX) {
            saves_chat_msg_t* slot = &ring[head];
            size_t name_len = (size_t)(tab - line);
            memcpy(slot->name, line, name_len); slot->name[name_len] = 0;
            size_t text_len = len - name_len - 1;
            if (text_len > SAVES_CHAT_TEXT_MAX) text_len = SAVES_CHAT_TEXT_MAX;
            memcpy(slot->text, tab + 1, text_len); slot->text[text_len] = 0;
            head = (head + 1) % cap;
            if (count < cap) ++count;
        }
        if (!nl) break;
        line = nl + 1;
    }
    free(buf);

    /* Unwrap into out, oldest first. */
    int start = (head - count + cap) % cap;
    for (int i = 0; i < count; ++i) out[i] = ring[(start + i) % cap];
    free(ring);
    return count;
}
