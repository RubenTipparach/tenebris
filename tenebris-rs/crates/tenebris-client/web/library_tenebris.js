/*
 * Tenebris web glue - emscripten --js-library.
 *
 * Port of every EM_JS body in the C tree to library form for the Rust
 * client (Rust has no EM_JS; the extern "C" declarations live in the
 * matching modules):
 *
 *   - main_web.c      -> app.rs        (query params, mobile detect,
 *                                       F5 block, pause / fullscreen
 *                                       buttons, mobile control deck)
 *   - client_kv.c     -> client_kv.rs  (localStorage passthrough)
 *   - profile.c       -> profile.rs    (crypto token)
 *   - menu.c          -> menu.rs       (room code, soft-keyboard shim,
 *                                       share invite)
 *   - net_client.c    -> net_client.rs (/saves + /saves/body fetch)
 *
 * Bodies are copied verbatim from the C EM_JS blocks; only the macro
 * wrapper changed to library syntax. Re-entry callbacks
 * (Module.ccall(...)) target the #[no_mangle] keepalive exports in
 * app.rs / menu.rs - keep -sEXPORTED_FUNCTIONS in build-web.* in sync.
 */

mergeInto(LibraryManager.library, {
  /* ==================================================================
   * main_web.c
   * ================================================================== */

  /* Read the server URL from the page's `?server=` query param. Returns
   * a malloc'd C string the caller must free, or NULL if no param was
   * set (in which case the client stays single-player offline). */
  tenebris_get_server_url__deps: ['$lengthBytesUTF8', '$stringToUTF8', 'malloc'],
  tenebris_get_server_url: function() {
    try {
      var u = new URL(window.location.href);
      var s = u.searchParams.get('server');
      if (!s) return 0;
      var len = lengthBytesUTF8(s) + 1;
      var p = _malloc(len);
      stringToUTF8(s, p, len);
      return p;
    } catch (_e) { return 0; }
  },

  /* Returns 1 if the browser is running on a mobile / tablet device
   * (or the URL carries ?perf=lite to force the low-power path on
   * desktop for testing). Read once at boot, fed to
   * renderer_set_perf_mode before renderer_init. */
  tenebris_is_mobile_device: function() {
    try {
      var u = new URL(window.location.href);
      var force = u.searchParams.get('perf');
      if (force === 'lite' || force === 'mobile') return 1;
      if (force === 'high' || force === 'desktop') return 0;
    } catch (_e) { /* fall through */ }
    try {
      var ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)) {
        return 1;
      }
      if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1
          && Math.min(screen.width, screen.height) <= 900) {
        return 1;
      }
    } catch (_e) { return 0; }
    return 0;
  },

  /* `?room=ABCD23` (or `?invite=ABCD23`) lets friends jump directly
   * into a self-host room without going through the menu. Returns NULL
   * if neither param is present. */
  tenebris_get_room_code__deps: ['$lengthBytesUTF8', '$stringToUTF8', 'malloc'],
  tenebris_get_room_code: function() {
    try {
      var u = new URL(window.location.href);
      var s = u.searchParams.get('room');
      if (!s) s = u.searchParams.get('invite');
      if (!s) return 0;
      s = s.toUpperCase().substring(0, 8);
      var len = lengthBytesUTF8(s) + 1;
      var p = _malloc(len);
      stringToUTF8(s, p, len);
      return p;
    } catch (_e) { return 0; }
  },

  /* Stop the browser from intercepting F5 (page refresh) while the
   * canvas has pointer focus - the in-game handler toggles the
   * water-flow debug overlay. Capture phase; menu / pause F5 still
   * refreshes the page. */
  tenebris_block_f5_refresh: function() {
    window.addEventListener('keydown', function(ev) {
      if (ev.key === 'F5' &&
          (document.pointerLockElement ||
           document.activeElement && document.activeElement.id === 'canvas')) {
        ev.preventDefault();
      }
    }, true);
  },

  /* HTML overlay pause button (mobile-only DOM scaffolding - sokol_gl
   * is unreliable on some mobile browsers). Click forwards into the
   * tenebris_js_pause_pressed keepalive export. */
  tenebris_pause_button_install: function() {
    if (document.getElementById('tenebris-pause-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'tenebris-pause-btn';
    btn.textContent = '∥';   /* "II" pause glyph */
    btn.setAttribute('aria-label', 'Pause');
    btn.style.cssText =
        'position:fixed;top:14px;left:14px;width:60px;height:60px;'
      + 'border-radius:50%;border:3px solid #fff;'
      + 'background:rgba(15,17,26,0.92);color:#fff;'
      + 'font-size:30px;font-weight:bold;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'cursor:pointer;z-index:10;'
      + 'touch-action:manipulation;'
      + '-webkit-tap-highlight-color:transparent;'
      + 'box-shadow:0 2px 6px rgba(0,0,0,0.5);'
      + 'visibility:hidden;';
    btn.addEventListener('click', function(ev) {
      ev.preventDefault();
      Module.ccall('tenebris_js_pause_pressed', null, [], []);
    });
    btn.addEventListener('touchend', function(ev) {
      ev.preventDefault();
      Module.ccall('tenebris_js_pause_pressed', null, [], []);
    });
    document.body.appendChild(btn);
  },

  tenebris_pause_button_set_visible: function(visible) {
    var b = document.getElementById('tenebris-pause-btn');
    if (b) b.style.visibility = visible ? 'visible' : 'hidden';
  },

  /* Top-right fullscreen toggle. Hides itself once fullscreen engages
   * (browser gestures / Esc exit). requestFullscreen may be undefined
   * on iPhone Safari - silently no-op there. */
  tenebris_fullscreen_button_install: function() {
    if (document.getElementById('tenebris-fullscreen-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'tenebris-fullscreen-btn';
    btn.textContent = '⛶';  /* square-four-corners */
    btn.setAttribute('aria-label', 'Fullscreen');
    btn.dataset.wantVisible = '0';  /* set by tenebris_fullscreen_button_set_visible */
    btn.style.cssText =
        'position:fixed;top:14px;right:14px;width:40px;height:40px;'
      + 'border-radius:50%;border:2px solid #fff;'
      + 'background:rgba(15,17,26,0.92);color:#fff;'
      + 'font-size:20px;font-weight:bold;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'cursor:pointer;z-index:10;'
      + 'touch-action:manipulation;'
      + '-webkit-tap-highlight-color:transparent;'
      + 'box-shadow:0 2px 6px rgba(0,0,0,0.5);'
      + 'visibility:hidden;';
    function isFullscreen() {
      var doc = document;
      return !!(doc.fullscreenElement
             || doc.webkitFullscreenElement
             || doc.mozFullScreenElement
             || doc.msFullscreenElement);
    }
    function refreshVisibility() {
      /* Show only when C asked for visible AND we are NOT already
       * fullscreen. */
      var want = btn.dataset.wantVisible === '1';
      btn.style.visibility = (want && !isFullscreen()) ? 'visible' : 'hidden';
    }
    btn._refresh = refreshVisibility;
    function toggleFullscreen(ev) {
      if (ev) ev.preventDefault();
      try {
        var doc = document;
        if (isFullscreen()) {
          if (doc.exitFullscreen) doc.exitFullscreen();
          else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
          else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
          else if (doc.msExitFullscreen) doc.msExitFullscreen();
        } else {
          var el = doc.documentElement;
          if (el.requestFullscreen) el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
          else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
          else if (el.msRequestFullscreen) el.msRequestFullscreen();
        }
      } catch (e) { /* Fullscreen unsupported (iPhone Safari); no-op */ }
    }
    btn.addEventListener('click',    toggleFullscreen);
    btn.addEventListener('touchend', toggleFullscreen);
    document.addEventListener('fullscreenchange',       refreshVisibility);
    document.addEventListener('webkitfullscreenchange', refreshVisibility);
    document.addEventListener('mozfullscreenchange',    refreshVisibility);
    document.addEventListener('MSFullscreenChange',     refreshVisibility);
    document.body.appendChild(btn);
  },

  tenebris_fullscreen_button_set_visible: function(visible) {
    var b = document.getElementById('tenebris-fullscreen-btn');
    if (!b) return;
    b.dataset.wantVisible = visible ? '1' : '0';
    if (b._refresh) b._refresh();
  },

  /* Full mobile control deck as DOM elements (two virtual joysticks +
   * Jump / Break / Place buttons). Each control streams its state into
   * the tenebris_js_set_* keepalive exports. Coordinate the layout
   * numbers with hotbar_ui's BOTTOM_MARGIN_MOBILE (see the C comment). */
  tenebris_mobile_controls_install: function() {
    if (document.getElementById('tenebris-mobile-controls')) return;
    var style = document.createElement('style');
    style.textContent = ''
      + '#tenebris-mobile-controls { position:fixed; inset:0; pointer-events:none; z-index:5; visibility:hidden; }'
      + '.tn-stick { position:absolute; width:70px; height:70px; border-radius:50%; '
      +    'background:rgba(20,22,30,0.45); border:2px solid rgba(255,255,255,0.7); '
      +    'pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent; }'
      + '.tn-stick .knob { position:absolute; left:50%; top:50%; width:28px; height:28px; '
      +    'border-radius:50%; background:rgba(255,255,255,0.85); transform:translate(-50%,-50%); pointer-events:none; }'
      + '#tn-stick-left  { bottom:56px; left:18px; }'
      + '#tn-stick-right { bottom:56px; right:18px; }'
      + '.tn-btn { position:absolute; width:44px; height:44px; border-radius:50%; '
      +    'background:rgba(15,17,26,0.88); color:#fff; border:2px solid rgba(255,255,255,0.85); '
      +    'font:bold 11px sans-serif; display:flex; align-items:center; justify-content:center; '
      +    'pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent; '
      +    'box-shadow:0 2px 6px rgba(0,0,0,0.5); user-select:none; }'
      + '.tn-btn:active { background:rgba(80,90,110,0.95); }'
      + '#tn-btn-jump  { bottom:138px; right: 18px; }'
      + '#tn-btn-break { bottom:138px; right: 66px; }'
      + '#tn-btn-place { bottom:138px; right:114px; }';
    document.head.appendChild(style);

    function mk(tag, id, cls, text) {
      var e = document.createElement(tag);
      if (id) e.id = id;
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    }
    var root = mk('div', 'tenebris-mobile-controls', null, null);
    var ls = mk('div', 'tn-stick-left',  'tn-stick', null);
    var rs = mk('div', 'tn-stick-right', 'tn-stick', null);
    var lk = mk('div', null, 'knob', null);
    var rk = mk('div', null, 'knob', null);
    ls.appendChild(lk); rs.appendChild(rk);
    var bJump  = mk('div', 'tn-btn-jump',  'tn-btn', 'JUMP');
    var bBreak = mk('div', 'tn-btn-break', 'tn-btn', 'BREAK');
    var bPlace = mk('div', 'tn-btn-place', 'tn-btn', 'PLACE');
    root.appendChild(ls); root.appendChild(rs);
    root.appendChild(bJump); root.appendChild(bBreak); root.appendChild(bPlace);
    document.body.appendChild(root);

    function makeStick(elem, knob, fnName) {
      var activeId = -1;
      function reset() {
        knob.style.left = '50%'; knob.style.top = '50%';
        Module.ccall(fnName, null,
            ['number','number','number'], [0, 0, 0]);
      }
      function update(touch) {
        var rect = elem.getBoundingClientRect();
        var cx = rect.left + rect.width * 0.5;
        var cy = rect.top  + rect.height * 0.5;
        var dx = touch.clientX - cx;
        var dy = touch.clientY - cy;
        var max = rect.width * 0.5;
        var len = Math.sqrt(dx*dx + dy*dy);
        if (len > max) { dx = dx * max / len; dy = dy * max / len; }
        knob.style.left = (50 + 100 * dx / rect.width)  + '%';
        knob.style.top  = (50 + 100 * dy / rect.height) + '%';
        var nx =  dx / max;
        var ny = -dy / max;     /* screen y flips */
        Module.ccall(fnName, null,
            ['number','number','number'], [nx, ny, 1]);
      }
      function findTouch(ev) {
        for (var i = 0; i < ev.changedTouches.length; ++i) {
          if (ev.changedTouches[i].identifier === activeId) {
            return ev.changedTouches[i];
          }
        }
        return null;
      }
      elem.addEventListener('touchstart', function(ev) {
        ev.preventDefault();
        if (activeId !== -1) return;
        var t = ev.changedTouches[0];
        activeId = t.identifier;
        update(t);
      }, { passive: false });
      elem.addEventListener('touchmove', function(ev) {
        ev.preventDefault();
        var t = findTouch(ev);
        if (t) update(t);
      }, { passive: false });
      function end(ev) {
        ev.preventDefault();
        if (findTouch(ev)) {
          activeId = -1;
          reset();
        }
      }
      elem.addEventListener('touchend',    end, { passive: false });
      elem.addEventListener('touchcancel', end, { passive: false });
    }
    makeStick(ls, lk, 'tenebris_js_set_move_stick');
    makeStick(rs, rk, 'tenebris_js_set_look_stick');

    function makeHoldBtn(elem, fnName) {
      function down(ev) {
        ev.preventDefault();
        Module.ccall(fnName, null, ['number'], [1]);
      }
      function up(ev) {
        ev.preventDefault();
        Module.ccall(fnName, null, ['number'], [0]);
      }
      elem.addEventListener('touchstart',  down, { passive: false });
      elem.addEventListener('touchend',    up,   { passive: false });
      elem.addEventListener('touchcancel', up,   { passive: false });
      elem.addEventListener('mousedown',   down);
      elem.addEventListener('mouseup',     up);
      elem.addEventListener('mouseleave',  up);
    }
    makeHoldBtn(bJump,  'tenebris_js_set_jump');
    makeHoldBtn(bBreak, 'tenebris_js_set_break');
    makeHoldBtn(bPlace, 'tenebris_js_set_place');
  },

  tenebris_mobile_controls_set_visible: function(visible) {
    var c = document.getElementById('tenebris-mobile-controls');
    if (c) c.style.visibility = visible ? 'visible' : 'hidden';
  },

  /* ==================================================================
   * client_kv.c - localStorage passthrough (client_kv.rs externs)
   * ================================================================== */

  kv_js_set__deps: ['$UTF8ToString'],
  kv_js_set: function(key, val) {
    try {
      window.localStorage.setItem(UTF8ToString(key), UTF8ToString(val));
    } catch (e) { /* localStorage disabled / quota */ }
  },

  kv_js_get__deps: ['$UTF8ToString', '$lengthBytesUTF8', '$stringToUTF8', 'malloc'],
  kv_js_get: function(key) {
    try {
      var s = window.localStorage.getItem(UTF8ToString(key));
      if (s === null) return 0;
      var len = lengthBytesUTF8(s) + 1;
      var p = _malloc(len);
      stringToUTF8(s, p, len);
      return p;
    } catch (e) { return 0; }
  },

  kv_js_remove__deps: ['$UTF8ToString'],
  kv_js_remove: function(key) {
    try { window.localStorage.removeItem(UTF8ToString(key)); } catch (e) {}
  },

  kv_js_list_prefix__deps: ['$UTF8ToString', '$lengthBytesUTF8', '$stringToUTF8', 'malloc'],
  kv_js_list_prefix: function(prefix) {
    try {
      var pfx = UTF8ToString(prefix);
      var found = [];
      for (var i = 0; i < window.localStorage.length; ++i) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf(pfx) === 0) found.push(k.substring(pfx.length));
      }
      if (found.length === 0) return 0;
      found.sort();
      var s = found.join('\n');
      var len = lengthBytesUTF8(s) + 1;
      var p = _malloc(len);
      stringToUTF8(s, p, len);
      return p;
    } catch (e) { return 0; }
  },

  /* ==================================================================
   * profile.c - crypto-random profile token (profile.rs extern)
   * ================================================================== */

  profile_js_new_token__deps: ['$lengthBytesUTF8', '$stringToUTF8', 'malloc'],
  profile_js_new_token: function() {
    try {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      var hex = '';
      for (var i = 0; i < bytes.length; ++i) {
        var h = bytes[i].toString(16);
        if (h.length < 2) h = '0' + h;
        hex += h;
      }
      var len = lengthBytesUTF8(hex) + 1;
      var p = _malloc(len);
      stringToUTF8(hex, p, len);
      return p;
    } catch (e) { return 0; }
  },

  /* ==================================================================
   * menu.c - room code, soft-keyboard shim, share invite (menu.rs)
   * ================================================================== */

  /* 6-char room code from a safe alphabet (no ambiguous 0/O, 1/I). */
  menu_js_new_room_code__deps: ['$lengthBytesUTF8', '$stringToUTF8', 'malloc'],
  menu_js_new_room_code: function() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var b = new Uint8Array(6);
    crypto.getRandomValues(b);
    var code = '';
    for (var i = 0; i < 6; ++i) code += A[b[i] & 31];
    var len = lengthBytesUTF8(code) + 1;
    var p = _malloc(len);
    stringToUTF8(code, p, len);
    return p;
  },

  /* Mobile soft-keyboard shim: hidden 1x1 <input> focused inside the
   * user gesture so iOS / Android open their keyboard; events forward
   * into the tenebris_js_input_* keepalive exports (menu.rs). The
   * visible text box stays in-canvas per CLAUDE.md. */
  menu_js_focus_text_input: function() {
    var inp = document.getElementById('tenebris-text-input-shim');
    if (!inp) {
      inp = document.createElement('input');
      inp.id = 'tenebris-text-input-shim';
      inp.type = 'text';
      inp.autocapitalize = 'off';
      inp.autocomplete   = 'off';
      inp.autocorrect    = 'off';
      inp.spellcheck     = false;
      inp.setAttribute('aria-hidden', 'true');
      inp.style.cssText =
          'position:fixed;left:50%;top:50%;width:1px;height:1px;'
          + 'opacity:0;border:0;padding:0;margin:0;background:transparent;'
          + 'color:transparent;caret-color:transparent;z-index:-1;';
      document.body.appendChild(inp);

      var lastVal = '';
      inp.addEventListener('input', function() {
        var cur = inp.value;
        if (cur.length > lastVal.length) {
          for (var i = lastVal.length; i < cur.length; i++) {
            Module.ccall('tenebris_js_input_char', null,
                         ['number'], [cur.charCodeAt(i)]);
          }
        } else if (cur.length < lastVal.length) {
          var diff = lastVal.length - cur.length;
          for (var i = 0; i < diff; i++) {
            Module.ccall('tenebris_js_input_backspace', null, [], []);
          }
        }
        lastVal = cur;
      });
      inp.addEventListener('keydown', function(ev) {
        if (ev.key === 'Enter') {
          Module.ccall('tenebris_js_input_submit', null, [], []);
          ev.preventDefault();
        } else if (ev.key === 'Escape') {
          Module.ccall('tenebris_js_input_cancel', null, [], []);
          ev.preventDefault();
        }
      });
      /* iOS Safari hides the keyboard the instant focus leaves the
       * input; re-focus on blur if we're still in an input state. */
      inp.addEventListener('blur', function() {
        if (Module.ccall('tenebris_js_in_input_state', 'number', [], [])) {
          setTimeout(function(){ inp.focus(); }, 0);
        }
      });
      window.__tenebris_input_shim_reset = function() { lastVal = ''; inp.value = ''; };
    }
    if (window.__tenebris_input_shim_reset) window.__tenebris_input_shim_reset();
    /* Synchronous focus inside the gesture - iOS Safari only opens the
     * soft keyboard from within a user gesture handler. */
    inp.focus();
  },

  menu_js_blur_text_input: function() {
    var inp = document.getElementById('tenebris-text-input-shim');
    if (inp) inp.blur();
  },

  /* Share URL via the Web Share API or clipboard fallback. Returns
   * 1 = shared, 2 = copied to clipboard, 0 = neither API available. */
  menu_js_share_invite__deps: ['$UTF8ToString'],
  menu_js_share_invite: function(room_code) {
    var c = UTF8ToString(room_code);
    if (!c) c = "";
    try {
      var url = window.location.origin + window.location.pathname
              + '?invite=' + encodeURIComponent(c);
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: 'Tenebris',
          text:  'Join my Tenebris room',
          url:   url
        }).catch(function(){});
        return 1;
      }
      if (typeof navigator !== 'undefined'
          && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(function(){});
        return 2;
      }
    } catch (_e) { }
    return 0;
  },

  /* ==================================================================
   * net_client.c - /saves + /saves/body fetches (net_client.rs)
   * ================================================================== */

  net_client_js_fetch_saves__deps: ['$UTF8ToString', '$lengthBytesUTF8', '$stringToUTF8', 'malloc', 'free'],
  net_client_js_fetch_saves: function(url_cstr) {
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
  },

  net_client_js_fetch_body__deps: ['malloc', 'free', '$UTF8ToString'],
  net_client_js_fetch_body: function(url_cstr, body_id) {
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
  },
});
