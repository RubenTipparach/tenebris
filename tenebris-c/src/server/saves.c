#include "server/saves.h"
#include "core/blocks.h"
#include "core/world.h"

#include <dirent.h>
#include <errno.h>
#include <fcntl.h>      /* open(O_RDONLY) for parent-dir fsync */
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

/* Atomic write: tmp file -> fsync -> rename -> fsync(parent dir).
 *
 * Without the fsyncs the data sits in page cache after fclose+rename.
 * Fly's auto_stop_machines='stop' policy stops idle machines, and even
 * a graceful SIGTERM doesn't guarantee dirty pages flush before the
 * VM disappears - we've observed block edits silently vanish across
 * a sleep/wake cycle. fsync(file) makes sure the bytes are durable
 * before the rename, and fsync(parent_dir) makes the rename itself
 * durable (POSIX requires the directory's own metadata to be synced
 * for a rename to survive a crash).
 *
 * Per-edit fsync is fine performance-wise: blocks are placed at human
 * speed, the WS handler is single-threaded, and the volume backing
 * /data on Fly handles low-frequency fsyncs comfortably. */
static bool write_atomic(const char* path, const void* data, size_t len) {
    char tmp[512];
    snprintf(tmp, sizeof tmp, "%s.tmp", path);
    FILE* f = fopen(tmp, "wb");
    if (!f) { fprintf(stderr, "[saves] fopen %s: %s\n", tmp, strerror(errno)); return false; }
    size_t n = fwrite(data, 1, len, f);
    if (n != len) {
        fprintf(stderr, "[saves] short write %s: %zu of %zu (%s)\n",
                tmp, n, len, strerror(errno));
        fclose(f);
        unlink(tmp);
        return false;
    }
    if (fflush(f) != 0) {
        fprintf(stderr, "[saves] fflush %s: %s\n", tmp, strerror(errno));
        fclose(f);
        unlink(tmp);
        return false;
    }
    /* Push the bytes to disk before we rename them into the public
     * name. Without this, a crash between rename and the next sync
     * leaves the new directory entry pointing at a zero-length file. */
    if (fsync(fileno(f)) != 0) {
        fprintf(stderr, "[saves] fsync %s: %s\n", tmp, strerror(errno));
        fclose(f);
        unlink(tmp);
        return false;
    }
    if (fclose(f) != 0) {
        fprintf(stderr, "[saves] fclose %s: %s\n", tmp, strerror(errno));
        unlink(tmp);
        return false;
    }
    if (rename(tmp, path) != 0) {
        fprintf(stderr, "[saves] rename %s -> %s: %s\n",
                tmp, path, strerror(errno));
        unlink(tmp);
        return false;
    }
    /* fsync the parent directory so the rename persists. Best-effort:
     * a directory open or fsync failure here means the bytes are
     * durable but the directory entry might not be - log and keep
     * going, the next save attempt under the same dir will re-sync. */
    char parent[512];
    snprintf(parent, sizeof parent, "%s", path);
    char* slash = strrchr(parent, '/');
    if (slash) {
        *slash = 0;
        int dfd = open(parent, O_RDONLY);
        if (dfd < 0) {
            fprintf(stderr, "[saves] open dir %s for fsync: %s\n",
                    parent, strerror(errno));
        } else {
            if (fsync(dfd) != 0) {
                fprintf(stderr, "[saves] fsync dir %s: %s\n",
                        parent, strerror(errno));
            }
            close(dfd);
        }
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

/* Forward decls for helpers defined further down (audit_path /
 * audit_truncate live next to the sessions + chat audit code). */
static bool audit_path    (const char* which, char* out, size_t cap);
static void audit_truncate(const char* path);

/* One-shot migration of historic per-room chat files into the global
 * chat.log so the in-game backlog (which now reads chat.log) and the
 * dashboard /chat endpoint match. Runs at most once per saves_dir;
 * the marker file <saves>/.chat_migrated short-circuits subsequent
 * boots. Entries already present in chat.log (matched by
 * name|room|text tuple) are skipped so the migration is idempotent
 * even if the marker disappears.
 *
 * Per-room files store `name\ttext` lines with no timestamps. We
 * approximate using each file's mtime, which preserves the relative
 * order of rooms and is close enough for the dashboard timeline. */
static bool key_present_in(const char* haystack, size_t hay_len,
                             const char* room, const char* name,
                             const char* text) {
    /* chat.log lines look like "<ts>\t<name>\t<room>\t<text>\n".
     * The dedup needle "\t<name>\t<room>\t<text>\n" matches both at
     * line start (after the timestamp) and never collides with a
     * line whose text legitimately contains the needle (newlines
     * are stripped at write time by strip_log_chars). */
    char needle[SAVES_CHAT_NAME_MAX + 32 + SAVES_CHAT_TEXT_MAX + 8];
    int n = snprintf(needle, sizeof needle, "\t%s\t%s\t%s\n",
                     name, room, text);
    if (n <= 0 || (size_t)n >= sizeof needle) return false;
    /* memmem isn't on every libc; do a small manual scan instead. */
    if (hay_len < (size_t)n) return false;
    for (size_t i = 0; i + (size_t)n <= hay_len; ++i) {
        if (memcmp(haystack + i, needle, (size_t)n) == 0) return true;
    }
    return false;
}

static void migrate_chat_per_room_to_global(void) {
    char marker[512];
    snprintf(marker, sizeof marker, "%s/.chat_migrated", G_saves_dir);
    if (access(marker, F_OK) == 0) return;

    char chat_dir[512];
    snprintf(chat_dir, sizeof chat_dir, "%s/chat", G_saves_dir);
    DIR* d = opendir(chat_dir);
    if (!d) {
        /* No per-room files - nothing to migrate. Still drop the
         * marker so we don't re-stat every boot. */
        FILE* f = fopen(marker, "wb");
        if (f) { fputs("ok\n", f); fclose(f); }
        return;
    }

    /* Pre-read chat.log into memory for dedup. */
    char global_path[512];
    if (!audit_path("chat", global_path, sizeof global_path)) {
        closedir(d);
        return;
    }
    char*  existing     = NULL;
    size_t existing_len = 0;
    {
        FILE* f = fopen(global_path, "rb");
        if (f) {
            fseek(f, 0, SEEK_END);
            long sz = ftell(f);
            if (sz > 0 && sz < 8 * 1024 * 1024) {
                existing = (char*)malloc((size_t)sz + 1);
                if (existing) {
                    rewind(f);
                    existing_len = fread(existing, 1, (size_t)sz, f);
                    existing[existing_len] = 0;
                }
            }
            fclose(f);
        }
    }

    int appended = 0;
    int scanned  = 0;
    struct dirent* e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        const char* dot = strrchr(e->d_name, '.');
        if (!dot || strcmp(dot, ".log") != 0) continue;

        /* Filename "<room>.log" -> on-disk room slug. */
        char room[16];
        size_t rlen = (size_t)(dot - e->d_name);
        if (rlen >= sizeof room) rlen = sizeof room - 1;
        memcpy(room, e->d_name, rlen);
        room[rlen] = 0;

        char path[600];
        snprintf(path, sizeof path, "%s/%s", chat_dir, e->d_name);
        struct stat st;
        uint64_t ts_base = (uint64_t)time(NULL);
        if (stat(path, &st) == 0) ts_base = (uint64_t)st.st_mtime;

        FILE* f = fopen(path, "rb");
        if (!f) continue;

        /* Read the whole file (capped at 1 MiB matching the runtime
         * truncation cap), parse line-by-line. */
        fseek(f, 0, SEEK_END);
        long sz = ftell(f);
        if (sz <= 0 || sz > 1024 * 1024) { fclose(f); continue; }
        rewind(f);
        char* buf = (char*)malloc((size_t)sz + 1);
        if (!buf) { fclose(f); continue; }
        size_t r = fread(buf, 1, (size_t)sz, f);
        fclose(f);
        buf[r] = 0;

        /* Count lines first so we can spread timestamps across the
         * file's mtime window (oldest line oldest, newest closest to
         * mtime). N lines -> stride 1 second back per line. */
        int line_count = 0;
        for (size_t i = 0; i < r; ++i) if (buf[i] == '\n') ++line_count;
        int idx = 0;
        char* line = buf;
        while (line < buf + r) {
            char* nl = (char*)memchr(line, '\n', (size_t)(buf + r - line));
            size_t len = nl ? (size_t)(nl - line) : (size_t)(buf + r - line);
            char* tab = (char*)memchr(line, '\t', len);
            if (tab && tab > line) {
                size_t name_len = (size_t)(tab - line);
                size_t text_len = len - name_len - 1;
                if (name_len > 0 && name_len <= SAVES_CHAT_NAME_MAX) {
                    char name[SAVES_CHAT_NAME_MAX + 1];
                    char text[SAVES_CHAT_TEXT_MAX + 1];
                    memcpy(name, line, name_len); name[name_len] = 0;
                    if (text_len > SAVES_CHAT_TEXT_MAX) text_len = SAVES_CHAT_TEXT_MAX;
                    memcpy(text, tab + 1, text_len); text[text_len] = 0;
                    ++scanned;
                    /* Skip entries that are already in chat.log. */
                    bool already = (existing && key_present_in(
                                       existing, existing_len, room, name, text));
                    if (!already) {
                        /* Write a chat.log line directly so we get a
                         * synthetic timestamp instead of the current
                         * wall clock that saves_global_chat_append
                         * would stamp. */
                        FILE* g = fopen(global_path, "ab");
                        if (g) {
                            uint64_t ts = ts_base
                                        - (uint64_t)(line_count - 1 - idx);
                            fprintf(g, "%llu\t%s\t%s\t%s\n",
                                    (unsigned long long)ts, name, room, text);
                            fclose(g);
                            ++appended;
                        }
                    }
                }
            }
            ++idx;
            if (!nl) break;
            line = nl + 1;
        }
        free(buf);
    }
    closedir(d);
    free(existing);

    /* Touch the marker so the migration doesn't re-run. */
    FILE* mf = fopen(marker, "wb");
    if (mf) {
        fprintf(mf, "scanned=%d appended=%d\n", scanned, appended);
        fclose(mf);
    }
    printf("[saves] chat migration: scanned=%d entries across per-room files, "
           "appended %d to chat.log (rest already present)\n",
           scanned, appended);
    fflush(stdout);
    /* Run audit_truncate so the file stays under SAVES_AUDIT_FILE_MAX. */
    audit_truncate(global_path);
}

/* On boot, walk sessions.log and write a "logout" event for any
 * (name, room) whose most recent event was a login - those sessions
 * never paired with a logout / timeout and would render forever as
 * "live" on the dashboard. The fresh server has no clients yet, so
 * any prior open session is over by definition.
 *
 * Also detects MID-STREAM orphans: a sequence
 *   login Ruben    <- never paired
 *   login Ruben    <- overwrites the previous one's open-state
 *   logout Ruben   <- closes only the SECOND login, leaving the
 *                     first as a forever-live row
 * Whenever a login lands for an already-open (name, room), we
 * stamp a synthetic logout for the prior login at the new login's
 * timestamp.
 *
 * Writes happen after the scan completes so we don't read our own
 * appends mid-walk. */
static void close_orphan_sessions_at_startup(void) {
    if (!G_saves_dir) return;
    char path[512];
    if (!audit_path("sessions", path, sizeof path)) return;

    FILE* f = fopen(path, "rb");
    if (!f) return;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz <= 0 || sz > 4 * 1024 * 1024) { fclose(f); return; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    /* Per (name, room): is the most recent event a login? */
    typedef struct {
        char name[SAVES_CHAT_NAME_MAX + 1];
        char room[16];
        bool open;
    } session_state_t;
    static session_state_t sessions[SAVES_AUDIT_FILE_MAX + 8];
    int session_count = 0;

    /* Stash of orphan-closing logouts to write after the scan. Each
     * entry's ts is the timestamp of whatever event made it an
     * orphan (the over-writing login, or the boot time for trailing
     * opens). */
    typedef struct {
        char     name[SAVES_CHAT_NAME_MAX + 1];
        char     room[16];
        int64_t  ts;
    } pending_close_t;
    static pending_close_t pending[SAVES_AUDIT_FILE_MAX + 8];
    int pending_count = 0;

    char* line = buf;
    while (line < buf + r) {
        char* nl = (char*)memchr(line, '\n', (size_t)(buf + r - line));
        size_t llen = nl ? (size_t)(nl - line) : (size_t)(buf + r - line);
        if (llen == 0) goto next;
        /* Tab-split into 4 fields: ts \t event \t name \t room. */
        char* tab1 = (char*)memchr(line, '\t', llen);
        if (!tab1) goto next;
        size_t after1 = (size_t)(line + llen - (tab1 + 1));
        char* tab2 = (char*)memchr(tab1 + 1, '\t', after1);
        if (!tab2) goto next;
        size_t after2 = (size_t)(line + llen - (tab2 + 1));
        char* tab3 = (char*)memchr(tab2 + 1, '\t', after2);
        if (!tab3) goto next;

        int64_t ts            = (int64_t)strtoll(line, NULL, 10);
        const char* event_p   = tab1 + 1;
        size_t      event_len = (size_t)(tab2 - event_p);
        const char* name_p    = tab2 + 1;
        size_t      name_len  = (size_t)(tab3 - name_p);
        const char* room_p    = tab3 + 1;
        size_t      room_len  = (size_t)(line + llen - room_p);

        if (name_len == 0 || name_len > SAVES_CHAT_NAME_MAX) goto next;
        char name[SAVES_CHAT_NAME_MAX + 1];
        char room[16];
        memcpy(name, name_p, name_len); name[name_len] = 0;
        if (room_len > sizeof room - 1) room_len = sizeof room - 1;
        memcpy(room, room_p, room_len); room[room_len] = 0;

        bool is_login   = (event_len == 5 && memcmp(event_p, "login",   5) == 0);
        bool is_logout  = (event_len == 6 && memcmp(event_p, "logout",  6) == 0);
        bool is_timeout = (event_len == 7 && memcmp(event_p, "timeout", 7) == 0);
        if (!is_login && !is_logout && !is_timeout) goto next;

        /* Find or insert the per-key state slot. */
        int idx = -1;
        for (int i = 0; i < session_count; ++i) {
            if (strcmp(sessions[i].name, name) == 0
                && strcmp(sessions[i].room, room) == 0) { idx = i; break; }
        }
        if (idx < 0) {
            if (session_count >= (int)(sizeof sessions / sizeof sessions[0])) goto next;
            idx = session_count++;
            snprintf(sessions[idx].name, sizeof sessions[idx].name, "%s", name);
            snprintf(sessions[idx].room, sizeof sessions[idx].room, "%s", room);
            sessions[idx].open = false;
        }
        if (is_login) {
            /* Mid-stream orphan: the previous login for this key
             * never paired. Stash a synthetic logout at THIS login's
             * timestamp - that lands between the orphan login and
             * the new one, so the dashboard pair-finder closes the
             * earlier session cleanly. */
            if (sessions[idx].open
                && pending_count < (int)(sizeof pending / sizeof pending[0])) {
                snprintf(pending[pending_count].name,
                         sizeof pending[pending_count].name, "%s", name);
                snprintf(pending[pending_count].room,
                         sizeof pending[pending_count].room, "%s", room);
                pending[pending_count].ts = ts;
                ++pending_count;
            }
            sessions[idx].open = true;
        } else {
            sessions[idx].open = false;
        }
    next:
        if (!nl) break;
        line = nl + 1;
    }
    free(buf);

    /* Trailing opens (last event was a login): close at boot time. */
    int64_t now = (int64_t)time(NULL);
    for (int i = 0; i < session_count; ++i) {
        if (!sessions[i].open) continue;
        if (pending_count >= (int)(sizeof pending / sizeof pending[0])) break;
        snprintf(pending[pending_count].name,
                 sizeof pending[pending_count].name, "%s", sessions[i].name);
        snprintf(pending[pending_count].room,
                 sizeof pending[pending_count].room, "%s", sessions[i].room);
        pending[pending_count].ts = now;
        ++pending_count;
    }

    /* Append all pending logouts. We bypass saves_session_log because
     * its time() stamp would override the synthetic mid-stream
     * timestamps. The file format is intentionally identical. */
    if (pending_count > 0) {
        FILE* af = fopen(path, "ab");
        if (af) {
            int mid_orphans = 0, trailing_orphans = 0;
            for (int i = 0; i < pending_count; ++i) {
                const char* room_real =
                    (strcmp(pending[i].room, "__public__") == 0)
                        ? "__public__" : pending[i].room;
                fprintf(af, "%lld\tlogout\t%s\t%s\n",
                        (long long)pending[i].ts,
                        pending[i].name, room_real);
                if (pending[i].ts == now) ++trailing_orphans;
                else                       ++mid_orphans;
            }
            fclose(af);
            printf("[saves] startup orphan-session sweep: closed %d unpaired login(s) "
                   "(%d mid-stream + %d trailing)\n",
                   pending_count, mid_orphans, trailing_orphans);
            fflush(stdout);
            audit_truncate(path);
        }
    }
}

bool saves_init(const char* saves_dir) {
    if (!saves_dir || !*saves_dir) return false;
    G_saves_dir = saves_dir;
    if (!mkdir_p(saves_dir)) {
        fprintf(stderr, "[saves] FATAL: cannot create saves dir '%s' (%s) - "
                        "block edits will not persist across this session.\n",
                saves_dir, strerror(errno));
        G_saves_dir = NULL;
        return false;
    }
    char players[512];
    snprintf(players, sizeof players, "%s/players", saves_dir);
    if (!mkdir_p(players)) {
        fprintf(stderr, "[saves] FATAL: cannot create players dir '%s'\n", players);
        G_saves_dir = NULL;
        return false;
    }
    /* Writability probe. Round-trip a tiny sentinel through the same
     * write_atomic path the real saves use - if /data is mounted
     * read-only or the volume isn't actually attached, surface it
     * here at boot rather than letting every block edit fail one at
     * a time with the player thinking the world saved fine. */
    {
        char probe[512];
        snprintf(probe, sizeof probe, "%s/.write-probe", saves_dir);
        const char marker[] = "tenebris-saves-probe";
        if (!write_atomic(probe, marker, sizeof marker - 1)) {
            fprintf(stderr,
                    "[saves] FATAL: write-probe failed in '%s'. The saves "
                    "directory is unwritable. Block edits WILL NOT PERSIST. "
                    "Check the mount (Fly volume?) and process permissions.\n",
                    saves_dir);
            G_saves_dir = NULL;
            return false;
        }
        unlink(probe);
        printf("[saves] write-probe ok in %s\n", saves_dir);
    }
    load_or_write_manifest();
    /* Fold any historic per-room chat.log files into chat.log so the
     * in-game backlog and the /chat endpoint agree. Idempotent and
     * gated on a marker file. */
    migrate_chat_per_room_to_global();
    /* Close any login events that never paired with a logout / timeout
     * before the previous shutdown. The dashboard would otherwise
     * keep showing them as "live" forever - the live server is fresh
     * and has nobody connected, so any prior open session is by
     * definition over. */
    close_orphan_sessions_at_startup();
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
    if (!G_saves_dir) {
        fprintf(stderr, "[saves] write_tile rejected: saves disabled (no init/probe)\n");
        return false;
    }
    if (!w || !w->body) {
        fprintf(stderr, "[saves] write_tile rejected: null world/body\n");
        return false;
    }
    if (tile_idx < 0 || tile_idx >= w->tile_count) {
        fprintf(stderr, "[saves] write_tile rejected: tile=%d out of range [0,%d)\n",
                tile_idx, w->tile_count);
        return false;
    }
    char dir[512];
    body_dir(dir, sizeof dir, room, seed, (uint32_t)w->body->id);
    if (!mkdir_p(dir)) {
        fprintf(stderr, "[saves] write_tile mkdir_p(%s) failed: %s\n",
                dir, strerror(errno));
        return false;
    }
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
    if (!ok) {
        fprintf(stderr, "[saves] write_tile FAILED path=%s (room='%s' body=%u tile=%d)\n",
                path, room && *room ? room : "(public)",
                (unsigned)w->body->id, tile_idx);
    }
    /* Track that this tile now has a persisted column so the join-
     * time replay path picks it up on the next client connect. */
    if (ok) world_tile_mark_saved(w, tile_idx);
    return ok;
}

/* ----------------------------------------------------------------- */
/* Per-body torch list persistence. */

static void torches_path(char* out, size_t cap, const char* room,
                           uint64_t seed, uint32_t body_id) {
    snprintf(out, cap, "%s/rooms/%s/world-%llx/body-%u/torches.dat",
             G_saves_dir, room_dir_name(room),
             (unsigned long long)seed, (unsigned)body_id);
}

bool saves_torches_write(const char* room, uint64_t seed, uint32_t body_id,
                           const saves_torch_t* torches, int count) {
    if (!G_saves_dir) {
        fprintf(stderr, "[saves] torches_write rejected: saves disabled\n");
        return false;
    }
    if (count < 0) count = 0;
    if (count > SAVES_TORCHES_MAX_COUNT) count = SAVES_TORCHES_MAX_COUNT;
    if (count > 0 && !torches) {
        fprintf(stderr, "[saves] torches_write rejected: NULL list, count=%d\n", count);
        return false;
    }
    char dir[512];
    body_dir(dir, sizeof dir, room, seed, body_id);
    if (!mkdir_p(dir)) {
        fprintf(stderr, "[saves] torches_write mkdir_p(%s) failed: %s\n",
                dir, strerror(errno));
        return false;
    }
    char path[512];
    torches_path(path, sizeof path, room, seed, body_id);

    if (count == 0) {
        /* Empty list: remove the file rather than write a header-only
         * blob, so a body that's had all its torches removed shows up
         * the same way as one that never had any. unlink() succeeds
         * idempotently here. */
        if (unlink(path) != 0 && errno != ENOENT) {
            fprintf(stderr, "[saves] torches_write unlink(%s): %s\n",
                    path, strerror(errno));
            return false;
        }
        return true;
    }

    const size_t blob_len = SAVES_TORCHES_HEADER_SIZE
                            + (size_t)count * SAVES_TORCHES_ENTRY_SIZE;
    uint8_t* buf = (uint8_t*)malloc(blob_len);
    if (!buf) {
        fprintf(stderr, "[saves] torches_write OOM (%zu B)\n", blob_len);
        return false;
    }
    uint32_t magic = SAVES_TORCHES_MAGIC;
    uint32_t ver   = SAVES_TORCHES_VERSION;
    uint32_t bid   = body_id;
    uint32_t n     = (uint32_t)count;
    memcpy(buf + 0,  &magic, 4);
    memcpy(buf + 4,  &ver,   4);
    memcpy(buf + 8,  &bid,   4);
    memcpy(buf + 12, &n,     4);
    uint8_t* p = buf + SAVES_TORCHES_HEADER_SIZE;
    for (int i = 0; i < count; ++i) {
        int32_t tile = torches[i].tile_idx;
        memcpy(p + 0,  &tile,           4);
        memcpy(p + 4,  &torches[i].pos[0], 4);
        memcpy(p + 8,  &torches[i].pos[1], 4);
        memcpy(p + 12, &torches[i].pos[2], 4);
        memcpy(p + 16, &torches[i].up [0], 4);
        memcpy(p + 20, &torches[i].up [1], 4);
        memcpy(p + 24, &torches[i].up [2], 4);
        p += SAVES_TORCHES_ENTRY_SIZE;
    }
    bool ok = write_atomic(path, buf, blob_len);
    free(buf);
    if (!ok) {
        fprintf(stderr, "[saves] torches_write FAILED path=%s (room='%s' body=%u count=%d)\n",
                path, room && *room ? room : "(public)",
                (unsigned)body_id, count);
    }
    return ok;
}

int saves_torches_load(const char* room, uint64_t seed, uint32_t body_id,
                         saves_torch_t* out, int cap) {
    if (!G_saves_dir || !out || cap <= 0) return 0;
    char path[512];
    torches_path(path, sizeof path, room, seed, body_id);
    FILE* f = fopen(path, "rb");
    if (!f) return 0;
    uint8_t hdr[SAVES_TORCHES_HEADER_SIZE];
    if (fread(hdr, 1, sizeof hdr, f) != sizeof hdr) { fclose(f); return 0; }
    uint32_t magic, ver, bid, count;
    memcpy(&magic, hdr + 0,  4);
    memcpy(&ver,   hdr + 4,  4);
    memcpy(&bid,   hdr + 8,  4);
    memcpy(&count, hdr + 12, 4);
    if (magic != SAVES_TORCHES_MAGIC || ver != SAVES_TORCHES_VERSION) {
        fprintf(stderr, "[saves] torches_load %s: bad magic/version "
                "(magic=0x%08x ver=%u)\n", path, magic, ver);
        fclose(f);
        return 0;
    }
    if ((int)count > cap) count = (uint32_t)cap;
    if (count > SAVES_TORCHES_MAX_COUNT) count = SAVES_TORCHES_MAX_COUNT;
    int loaded = 0;
    for (uint32_t i = 0; i < count; ++i) {
        uint8_t e[SAVES_TORCHES_ENTRY_SIZE];
        if (fread(e, 1, sizeof e, f) != sizeof e) break;
        int32_t tile;
        memcpy(&tile, e + 0, 4);
        out[loaded].tile_idx = tile;
        memcpy(&out[loaded].pos[0], e + 4,  4);
        memcpy(&out[loaded].pos[1], e + 8,  4);
        memcpy(&out[loaded].pos[2], e + 12, 4);
        memcpy(&out[loaded].up [0], e + 16, 4);
        memcpy(&out[loaded].up [1], e + 20, 4);
        memcpy(&out[loaded].up [2], e + 24, 4);
        ++loaded;
    }
    fclose(f);
    (void)bid;   /* body_id stored in file for visual inspection; not validated */
    return loaded;
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

bool saves_room_body_has_edits(const char* room, uint64_t seed,
                                 uint32_t body_id) {
    if (!G_saves_dir) return false;
    char dir[512];
    body_dir(dir, sizeof dir, room, seed, body_id);
    DIR* d = opendir(dir);
    if (!d) return false;
    bool any = false;
    struct dirent* e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        const char* dot = strrchr(e->d_name, '.');
        if (dot && strcmp(dot, ".col") == 0) { any = true; break; }
    }
    closedir(d);
    return any;
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

/* Build a filesystem-safe key from a player name. Lowercase, allow
 * [a-z0-9_-], substitute '_' for space, drop everything else.
 * Names that sanitize to empty (e.g. all emoji) return false so the
 * caller skips the save instead of writing to a zero-length path.
 *
 * This is the on-disk identity for player poses: the same display
 * name always lands on the same save file, which is what the user
 * means by 'Ruben should spawn where Ruben left off' even across
 * profile re-creation, browser swap, or localStorage wipes. The
 * already-enforced unique-name rule on HELLO keeps two simultaneous
 * connections from fighting over the same file. */
static bool name_to_key(const char* name, char* out, size_t cap) {
    if (!name || !*name || cap < 2) return false;
    size_t o = 0;
    for (size_t i = 0; name[i] && o + 1 < cap; ++i) {
        char c = name[i];
        if (c == ' ') { out[o++] = '_'; continue; }
        if (c >= 'A' && c <= 'Z') c = (char)(c - 'A' + 'a');
        if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ||
            c == '-' || c == '_') {
            out[o++] = c;
        }
    }
    out[o] = 0;
    return o > 0;
}

static bool player_path_for_name(char* out, size_t cap, const char* name) {
    char key[64];
    if (!name_to_key(name, key, sizeof key)) return false;
    int n = snprintf(out, cap, "%s/players/%s.dat", G_saves_dir, key);
    return n > 0 && (size_t)n < cap;
}

bool saves_write_player(const char* name, const saves_player_pose_t* pose) {
    if (!G_saves_dir || !pose) return false;
    char path[512];
    if (!player_path_for_name(path, sizeof path, name)) return false;
    /* On-disk layout matches the in-memory struct; both server and
     * future loader see the same C ABI. Bump SAVES_PLAYER_VERSION
     * when fields shift. */
    saves_player_pose_t out = *pose;
    out.version = SAVES_PLAYER_VERSION;
    return write_atomic(path, &out, sizeof out);
}

bool saves_load_player(const char* name, saves_player_pose_t* out) {
    if (!G_saves_dir || !out) return false;
    char path[512];
    if (!player_path_for_name(path, sizeof path, name)) return false;
    FILE* f = fopen(path, "rb");
    if (!f) return false;
    saves_player_pose_t buf;
    memset(&buf, 0, sizeof buf);
    size_t n = fread(&buf, 1, sizeof buf, f);
    fclose(f);
    /* Accept both v1 (no inventory tail) and v2 (full struct). The
     * v1 partial read leaves the inv_* fields at their memset-zero
     * values, which the server treats as "empty hotbar" - cleaner
     * than rejecting the file and dropping the player at default
     * spawn. */
    if (n < (sizeof(uint32_t) * 2 + sizeof(double) * 3 + sizeof(float) * 2)) {
        return false;
    }
    if (buf.version == 1) {
        /* Truncated v1 record. Inventory stays zeroed. */
        memset(buf.inv_slot_type,  0, sizeof buf.inv_slot_type);
        memset(buf.inv_slot_count, 0, sizeof buf.inv_slot_count);
        buf.inv_selected = 0;
    } else if (buf.version != SAVES_PLAYER_VERSION) {
        fprintf(stderr, "[saves] player %s: version %u not supported (current %u), ignoring\n",
                name, buf.version, SAVES_PLAYER_VERSION);
        return false;
    }
    *out = buf;
    return true;
}

/* ----------------------------------------------------------------- */
/* Chat log                                                           */
/* ----------------------------------------------------------------- */

/* room_filename retired - per-room chat files are no longer the
 * source of truth. saves_chat_load_backlog now reads chat.log
 * filtered by room. */

/* Strip newline / tab from a string in place — they break our line
 * format. Cheap, runs once per chat append. */
static void strip_log_chars(char* s, size_t cap) {
    if (!s) return;
    for (size_t i = 0; i < cap && s[i]; ++i) {
        if (s[i] == '\n' || s[i] == '\r' || s[i] == '\t') s[i] = ' ';
    }
}

void saves_chat_append(const char* room, const char* name, const char* text) {
    /* Per-room chat files were dropped: chat.log is now the single
     * source of truth for both the dashboard view (GET /chat) and the
     * in-game backlog replay (saves_chat_load_backlog filters chat.log
     * by room). The historical two-path design caused exactly the
     * kind of drift the user reported - entries written to the
     * per-room file before the global feature shipped never appeared
     * on the dashboard, so the two views diverged. This forwards to
     * the global writer so old callers still produce the right
     * behaviour. */
    saves_global_chat_append(room, name, text);
}

/* ----------------------------------------------------------------- */
/* Audit logs (sessions + global chat).
 *
 * Shared helpers:
 *   - audit_path()        — resolve <saves_dir>/<which>.log
 *   - audit_truncate()    — drop oldest lines if past SAVES_AUDIT_FILE_MAX
 *   - audit_append_line() — fsync-less append (single-writer server)
 *   - audit_tail_lines()  — read up to N lines from the tail
 *
 * Files use \n line separators and \t field separators so curl + awk
 * read them trivially. Names/text get strip_log_chars'd identically
 * to per-room chat - no embedded tabs/newlines. */

static bool audit_path(const char* which, char* out, size_t cap) {
    if (!G_saves_dir || !which) return false;
    int n = snprintf(out, cap, "%s/%s.log", G_saves_dir, which);
    return n > 0 && (size_t)n < cap;
}

static void audit_truncate(const char* path) {
    /* Cheap: read the whole file, count newlines, rewrite tail via
     * .tmp swap when over cap. Matches the per-room chat log pattern. */
    FILE* f = fopen(path, "rb");
    if (!f) return;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    /* Conservative ceiling - audit files cap at ~5k lines * ~200 bytes
     * each. Anything past 4 MB means the writer has lost a guard and
     * we'd rather skip truncation than scan a runaway file. */
    if (sz < 0 || sz > 4 * 1024 * 1024) { fclose(f); return; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    int line_count = 0;
    for (size_t i = 0; i < r; ++i) if (buf[i] == '\n') ++line_count;
    if (line_count <= SAVES_AUDIT_FILE_MAX) { free(buf); return; }

    int drop = line_count - SAVES_AUDIT_FILE_MAX;
    size_t off = 0;
    int seen = 0;
    while (off < r && seen < drop) {
        if (buf[off] == '\n') ++seen;
        ++off;
    }
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

void saves_session_log(const char* event, const char* name, const char* room) {
    if (!G_saves_dir || !event || !name) return;
    char path[512];
    if (!audit_path("sessions", path, sizeof path)) return;

    char clean_event[16];
    char clean_name [SAVES_CHAT_NAME_MAX + 1];
    char clean_room [16];
    snprintf(clean_event, sizeof clean_event, "%s", event);
    snprintf(clean_name,  sizeof clean_name,  "%s", name);
    snprintf(clean_room,  sizeof clean_room,  "%s",
             (room && *room) ? room : "__public__");
    strip_log_chars(clean_event, sizeof clean_event);
    strip_log_chars(clean_name,  sizeof clean_name);
    strip_log_chars(clean_room,  sizeof clean_room);

    FILE* f = fopen(path, "ab");
    if (!f) return;
    fprintf(f, "%lld\t%s\t%s\t%s\n",
            (long long)time(NULL), clean_event, clean_name, clean_room);
    fclose(f);
    audit_truncate(path);
}

void saves_global_chat_append(const char* room, const char* name, const char* text) {
    if (!G_saves_dir || !name || !text) return;
    char path[512];
    if (!audit_path("chat", path, sizeof path)) return;

    char clean_name[SAVES_CHAT_NAME_MAX + 1];
    char clean_text[SAVES_CHAT_TEXT_MAX + 1];
    char clean_room[16];
    snprintf(clean_name, sizeof clean_name, "%s", name);
    snprintf(clean_text, sizeof clean_text, "%s", text);
    snprintf(clean_room, sizeof clean_room, "%s",
             (room && *room) ? room : "__public__");
    strip_log_chars(clean_name, sizeof clean_name);
    strip_log_chars(clean_text, sizeof clean_text);
    strip_log_chars(clean_room, sizeof clean_room);

    FILE* f = fopen(path, "ab");
    if (!f) return;
    fprintf(f, "%lld\t%s\t%s\t%s\n",
            (long long)time(NULL), clean_name, clean_room, clean_text);
    fclose(f);
    audit_truncate(path);
}

/* ----------------------------------------------------------------- */
/* Directory walker for /saves. Enumerates every .col file under
 * <saves_dir>/rooms/<room>/world-<seed>/body-<body>/ and fires the
 * visitor with the parsed identity + stat metadata. Single-threaded
 * server, so the malloc'd path strings stay short-lived. */

static void parse_seed_from_dir(const char* name, uint64_t* out_seed,
                                  bool* out_ok) {
    /* Expect "world-<hex>". On parse failure, mark not ok so the
     * caller skips this entry instead of fabricating a zero seed. */
    *out_ok = false;
    if (strncmp(name, "world-", 6) != 0) return;
    char* end = NULL;
    uint64_t s = strtoull(name + 6, &end, 16);
    if (!end || *end != 0) return;
    *out_seed = s;
    *out_ok = true;
}

static void parse_body_from_dir(const char* name, uint32_t* out_id,
                                  bool* out_ok) {
    *out_ok = false;
    if (strncmp(name, "body-", 5) != 0) return;
    char* end = NULL;
    unsigned long v = strtoul(name + 5, &end, 10);
    if (!end || *end != 0) return;
    *out_id = (uint32_t)v;
    *out_ok = true;
}

int saves_enumerate_tiles(saves_tile_visitor_t fn, void* user) {
    if (!G_saves_dir || !fn) return 0;
    char rooms_root[512];
    snprintf(rooms_root, sizeof rooms_root, "%s/rooms", G_saves_dir);
    DIR* rd = opendir(rooms_root);
    if (!rd) return 0;
    int total = 0;
    struct dirent* re;
    while ((re = readdir(rd)) != NULL) {
        if (re->d_name[0] == '.') continue;
        char world_root[600];
        snprintf(world_root, sizeof world_root, "%s/%s", rooms_root, re->d_name);
        DIR* wd = opendir(world_root);
        if (!wd) continue;
        struct dirent* we;
        while ((we = readdir(wd)) != NULL) {
            if (we->d_name[0] == '.') continue;
            uint64_t seed = 0;
            bool ok;
            parse_seed_from_dir(we->d_name, &seed, &ok);
            if (!ok) continue;
            char body_root[700];
            snprintf(body_root, sizeof body_root, "%s/%s",
                     world_root, we->d_name);
            DIR* bd = opendir(body_root);
            if (!bd) continue;
            struct dirent* be;
            while ((be = readdir(bd)) != NULL) {
                if (be->d_name[0] == '.') continue;
                uint32_t body_id = 0;
                parse_body_from_dir(be->d_name, &body_id, &ok);
                if (!ok) continue;
                char tile_root[800];
                snprintf(tile_root, sizeof tile_root, "%s/%s",
                         body_root, be->d_name);
                DIR* td = opendir(tile_root);
                if (!td) continue;
                struct dirent* te;
                while ((te = readdir(td)) != NULL) {
                    if (te->d_name[0] == '.') continue;
                    const char* dot = strrchr(te->d_name, '.');
                    if (!dot || strcmp(dot, ".col") != 0) continue;
                    int tile_idx = atoi(te->d_name);
                    char tile_path_buf[900];
                    snprintf(tile_path_buf, sizeof tile_path_buf,
                             "%s/%s", tile_root, te->d_name);
                    struct stat st;
                    if (stat(tile_path_buf, &st) != 0) continue;
                    fn(re->d_name, seed, body_id, tile_idx,
                       (size_t)st.st_size,
                       (uint64_t)st.st_mtime, user);
                    ++total;
                }
                closedir(td);
            }
            closedir(bd);
        }
        closedir(wd);
    }
    closedir(rd);
    return total;
}

/* ----------------------------------------------------------------- */
/* /saves/body bulk download. Walks the body's directory once, then
 * once again to write entries - simpler than building an intermediate
 * vector. Each .col file's payload comes from disk; we tolerate v0
 * (legacy 128 bytes, no header) and v1 (16-byte header + 128 bytes)
 * by detecting the header magic. Mismatched files are skipped with
 * a warning so a single corrupt entry doesn't drop the whole blob. */
bool saves_body_blob(const char* room, uint64_t seed, uint32_t body_id,
                       uint8_t* out, size_t cap, size_t* out_len) {
    if (out_len) *out_len = 0;
    if (!G_saves_dir || !out) return false;
    char dir[512];
    body_dir(dir, sizeof dir, room, seed, body_id);

    /* First pass: count valid tiles + compute total size so we can
     * decide whether the buffer fits before doing any writes. */
    DIR* d = opendir(dir);
    if (!d) {
        /* Empty / missing dir is success with zero tiles - return a
         * well-formed empty blob so the client can tell "no edits
         * for this body" from "fetch failed". */
        if (cap < SAVES_BODY_BLOB_HEADER) {
            if (out_len) *out_len = SAVES_BODY_BLOB_HEADER;
            return false;
        }
        uint32_t mag = SAVES_BODY_BLOB_MAGIC;
        uint32_t ver = SAVES_BODY_BLOB_VERSION;
        uint32_t bid = body_id;
        uint64_t sd  = seed;
        uint32_t tc  = 0;
        uint32_t dp  = WORLD_MAX_DEPTH;
        size_t off = 0;
        memcpy(out + off, &mag, 4); off += 4;
        memcpy(out + off, &ver, 4); off += 4;
        memcpy(out + off, &bid, 4); off += 4;
        memcpy(out + off, &sd,  8); off += 8;
        memcpy(out + off, &tc,  4); off += 4;
        memcpy(out + off, &dp,  4); off += 4;
        if (out_len) *out_len = SAVES_BODY_BLOB_HEADER;
        return true;
    }

    int     tile_count = 0;
    struct dirent* e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        const char* dot = strrchr(e->d_name, '.');
        if (!dot || strcmp(dot, ".col") != 0) continue;
        int tile = atoi(e->d_name);
        if (tile < 0) continue;
        ++tile_count;
    }
    closedir(d);

    /* Header (28) + per-record (4 + WORLD_MAX_DEPTH). */
    const size_t record_size = 4 + (size_t)WORLD_MAX_DEPTH;
    size_t needed = SAVES_BODY_BLOB_HEADER + (size_t)tile_count * record_size;
    if (out_len) *out_len = needed;
    if (needed > cap) return false;

    /* Write the fixed-layout header once. Field order matches the
     * documentation in saves.h - keep them in sync. */
    {
        uint32_t mag = SAVES_BODY_BLOB_MAGIC;
        uint32_t ver = SAVES_BODY_BLOB_VERSION;
        uint32_t bid = body_id;
        uint64_t sd  = seed;
        uint32_t tc  = (uint32_t)tile_count;
        uint32_t dp  = WORLD_MAX_DEPTH;
        size_t off = 0;
        memcpy(out + off, &mag, 4); off += 4;
        memcpy(out + off, &ver, 4); off += 4;
        memcpy(out + off, &bid, 4); off += 4;
        memcpy(out + off, &sd,  8); off += 8;
        memcpy(out + off, &tc,  4); off += 4;
        memcpy(out + off, &dp,  4); off += 4;
    }

    /* Second pass: emit each tile's record. */
    d = opendir(dir);
    if (!d) {
        /* Race - directory vanished between passes. Return header-only
         * (matches the "no edits" case). */
        memset(out + SAVES_BODY_BLOB_HEADER, 0, 0);
        if (out_len) *out_len = SAVES_BODY_BLOB_HEADER;
        return true;
    }
    size_t write_off = SAVES_BODY_BLOB_HEADER;
    int    written = 0;
    while ((e = readdir(d)) != NULL && write_off + record_size <= cap) {
        if (e->d_name[0] == '.') continue;
        const char* dot = strrchr(e->d_name, '.');
        if (!dot || strcmp(dot, ".col") != 0) continue;
        int tile = atoi(e->d_name);
        if (tile < 0) continue;
        char path[512];
        snprintf(path, sizeof path, "%s/%s", dir, e->d_name);
        FILE* f = fopen(path, "rb");
        if (!f) continue;
        /* Read the column payload, tolerating both v0 (raw 128 bytes)
         * and v1 (16-byte header + 128 bytes). Match the same logic as
         * saves_load_world so a tile readable by load is readable here. */
        uint8_t col[WORLD_MAX_DEPTH];
        uint8_t head[SAVES_TILE_HEADER_SIZE];
        size_t hn = fread(head, 1, sizeof head, f);
        bool ok = false;
        if (hn == sizeof head) {
            uint32_t fmagic, fver, fdepth;
            memcpy(&fmagic, head + 0, 4);
            memcpy(&fver,   head + 4, 4);
            memcpy(&fdepth, head + 8, 4);
            if (fmagic == SAVES_TILE_MAGIC
                && fver <= SAVES_TILE_VERSION
                && fdepth == WORLD_MAX_DEPTH) {
                size_t cn = fread(col, 1, WORLD_MAX_DEPTH, f);
                ok = (cn == WORLD_MAX_DEPTH);
            } else {
                /* Legacy v0: rewind + read raw 128 bytes. */
                rewind(f);
                size_t cn = fread(col, 1, WORLD_MAX_DEPTH, f);
                if (cn == WORLD_MAX_DEPTH) {
                    uint8_t spill;
                    if (fread(&spill, 1, 1, f) == 0) ok = true;
                }
            }
        }
        fclose(f);
        if (!ok) {
            fprintf(stderr, "[saves] body_blob: skipping unreadable %s\n", path);
            continue;
        }
        uint32_t tile_idx = (uint32_t)tile;
        memcpy(out + write_off, &tile_idx, 4); write_off += 4;
        memcpy(out + write_off, col, WORLD_MAX_DEPTH); write_off += WORLD_MAX_DEPTH;
        ++written;
    }
    closedir(d);
    /* The header's tile_count was computed from the first pass; if
     * the second pass skipped some unreadable files, rewrite the
     * count so parsers don't read past the end. */
    if (written != tile_count) {
        uint32_t tc_fixed = (uint32_t)written;
        memcpy(out + 20, &tc_fixed, 4);
    }
    if (out_len) *out_len = write_off;
    return true;
}

size_t saves_audit_tail(const char* which, int max_lines,
                          char* out, size_t cap) {
    if (!out || cap == 0) return 0;
    out[0] = 0;
    char path[512];
    if (!audit_path(which, path, sizeof path)) return 0;
    if (max_lines <= 0) max_lines = SAVES_AUDIT_FILE_MAX;

    FILE* f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz < 0 || sz > 4 * 1024 * 1024) { fclose(f); return 0; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return 0; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    /* Count newlines, then walk forward to the start of the keep
     * window so the tail comes out copied as one contiguous slice. */
    int total = 0;
    for (size_t i = 0; i < r; ++i) if (buf[i] == '\n') ++total;
    int drop = total - max_lines;
    if (drop < 0) drop = 0;
    size_t off = 0;
    int seen = 0;
    while (off < r && seen < drop) {
        if (buf[off] == '\n') ++seen;
        ++off;
    }
    size_t avail = r - off;
    if (avail >= cap) avail = cap - 1;
    memcpy(out, buf + off, avail);
    out[avail] = 0;
    free(buf);
    return avail;
}

int saves_chat_load_backlog(const char* room,
                              saves_chat_msg_t* out, int cap) {
    if (!G_saves_dir || !out || cap <= 0) return 0;

    /* Single source of truth: parse <saves>/chat.log, filter by room,
     * keep the last `cap` matching entries. chat.log lines look like:
     *   <ts>\t<name>\t<room>\t<text>\n
     * The per-room <saves>/chat/<room>.log file is no longer read or
     * written - the migration in saves_init folds its contents into
     * chat.log on first boot, after which everything routes through
     * one file. */
    char path[512];
    if (!audit_path("chat", path, sizeof path)) return 0;
    FILE* f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz <= 0 || sz > 8 * 1024 * 1024) { fclose(f); return 0; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return 0; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    /* Map empty / NULL incoming room to the on-disk slug "__public__"
     * so the comparison against chat.log lines (which carry the same
     * slug from saves_global_chat_append) matches. */
    const char* want_room = (room && *room) ? room : "__public__";

    saves_chat_msg_t* ring = (saves_chat_msg_t*)calloc((size_t)cap, sizeof(*ring));
    if (!ring) { free(buf); return 0; }
    int head = 0, count = 0;
    /* Filter out anything older than 12 hours so the join-time replay
     * doesn't ship a player ancient logs that have no chance of being
     * useful conversation context. 12 h matches the "if I haven't been
     * here in half a day, those messages are irrelevant" intuition;
     * could become configurable later. The timestamp field is the
     * first \t-delimited field on each line. */
    const long long now_ts = (long long)time(NULL);
    const long long max_age_s = 12LL * 60LL * 60LL;
    char* line = buf;
    while (line < buf + r) {
        char* nl = (char*)memchr(line, '\n', (size_t)(buf + r - line));
        size_t len = nl ? (size_t)(nl - line) : (size_t)(buf + r - line);
        /* Find the three field separators (\t). Format demands four
         * fields - bail on any line that doesn't have them. */
        char* tab1 = (char*)memchr(line, '\t', len);
        if (!tab1) goto next_line;
        /* Parse the leading timestamp and skip stale entries. strtoll
         * stops at the tab so we don't need a null terminator. */
        long long ts = strtoll(line, NULL, 10);
        if (ts > 0 && (now_ts - ts) > max_age_s) goto next_line;
        size_t rest_len = len - (size_t)(tab1 + 1 - line);
        char* tab2 = (char*)memchr(tab1 + 1, '\t', rest_len);
        if (!tab2) goto next_line;
        size_t rest2_len = len - (size_t)(tab2 + 1 - line);
        char* tab3 = (char*)memchr(tab2 + 1, '\t', rest2_len);
        if (!tab3) goto next_line;

        const char* name_start = tab1 + 1;
        size_t      name_len   = (size_t)(tab2 - name_start);
        const char* room_start = tab2 + 1;
        size_t      room_len   = (size_t)(tab3 - room_start);
        const char* text_start = tab3 + 1;
        size_t      text_len   = (size_t)(line + len - text_start);

        /* Room filter. Compare bytes exactly so "__public__" only
         * matches the lobby. */
        size_t want_len = strlen(want_room);
        if (room_len != want_len) goto next_line;
        if (memcmp(room_start, want_room, want_len) != 0) goto next_line;
        if (name_len == 0 || name_len > SAVES_CHAT_NAME_MAX) goto next_line;

        saves_chat_msg_t* slot = &ring[head];
        if (name_len > SAVES_CHAT_NAME_MAX) name_len = SAVES_CHAT_NAME_MAX;
        memcpy(slot->name, name_start, name_len); slot->name[name_len] = 0;
        if (text_len > SAVES_CHAT_TEXT_MAX) text_len = SAVES_CHAT_TEXT_MAX;
        memcpy(slot->text, text_start, text_len); slot->text[text_len] = 0;
        head = (head + 1) % cap;
        if (count < cap) ++count;
    next_line:
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
