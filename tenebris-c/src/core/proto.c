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
    put_u32_le(p + 4 + MSG_HELLO_TOKEN_LEN, m->reserved);
    return total;
}

int proto_read_hello(const uint8_t* payload, size_t len, msg_hello_t* out) {
    if (len < MSG_HELLO_WIRE_SIZE) return -1;
    out->client_version = get_u32_le(payload + 0);
    memcpy(out->token, payload + 4, MSG_HELLO_TOKEN_LEN);
    out->reserved = get_u32_le(payload + 4 + MSG_HELLO_TOKEN_LEN);
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
    return 0;
}
