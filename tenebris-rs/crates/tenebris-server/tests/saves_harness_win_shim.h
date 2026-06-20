/* Force-included (gcc -include) when building the saves byte-compat
 * harness with MinGW on Windows. saves.c is written against POSIX;
 * MinGW lacks the two-arg mkdir() and fsync(). Pre-include the CRT
 * headers so their one-arg mkdir declaration is parsed BEFORE the
 * macro below renames call sites. No-op on non-Windows hosts. */
#ifdef _WIN32
#include <sys/stat.h>
#include <sys/types.h>
#include <io.h>
#include <direct.h>
static __inline int tn_mkdir2(const char* p, int m) { (void)m; return _mkdir(p); }
#define mkdir tn_mkdir2
#define fsync _commit
#endif
