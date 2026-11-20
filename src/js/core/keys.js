/*
 * Remote control input.
 *  - Arrows / Enter / Back (10009) arrive without registration.
 *  - Color keys need tizen.tvinputdevice.registerKey (privilege tv.inputdevice).
 *  - Desktop fallback: Backspace/Esc = Back, F1..F4 = Red/Green/Yellow/Blue.
 *
 * Holding an arrow on a Samsung remote fires keydown in a fast burst; directional
 * actions are throttled so focus moves at a steady, animatable pace.
 *
 * Text fields: navigation never gives DOM focus to anything except <input>s,
 * and only on OK (that opens Samsung's on-screen keyboard). While an input is
 * focused, typing keys go to it; Done/Cancel/Back/Enter/Up/Down leave it.
 */
(function (LL) {
  'use strict';

  var CODES = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down',
    13: 'enter',
    10009: 'back',
    403: 'red', 404: 'green', 405: 'yellow', 406: 'blue',
    // Desktop development fallbacks
    8: 'back', 27: 'back',
    112: 'red', 113: 'green', 114: 'yellow', 115: 'blue'
  };
  for (var d = 0; d <= 9; d++) CODES[48 + d] = 'num' + d;   // number keys (and the desktop's top row)

  var IME_DONE = 65376;
  var IME_CANCEL = 65385;
  var LEAVE_INPUT = { 13: 1, 27: 1, 10009: 1, 38: 1, 40: 1 };
  LEAVE_INPUT[IME_DONE] = 1;
  LEAVE_INPUT[IME_CANCEL] = 1;

  var TIZEN_KEYS = ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  var DIRECTIONAL = { left: 1, right: 1, up: 1, down: 1 };
  var REPEAT_INTERVAL_MS = 95;

  var handler = null;
  var lastMoveAt = 0;

  function register() {
    if (!LL.platform.isTizen || !window.tizen.tvinputdevice) return;
    TIZEN_KEYS.forEach(function (name) {
      try { window.tizen.tvinputdevice.registerKey(name); }
      catch (e) { console.warn('[keys] registerKey failed:', name, e); }
    });
  }

  function isTextField(el) {
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }

  function dispatch(action, e) {
    if (DIRECTIONAL[action]) {
      var now = Date.now();
      if (now - lastMoveAt < REPEAT_INTERVAL_MS) return;
      lastMoveAt = now;
    }
    if (handler) handler(action, e);
  }

  function onKeyDown(e) {
    var k = e.keyCode;

    if (isTextField(e.target)) {
      if (!LEAVE_INPUT[k]) return;            // typing, caret, backspace: the input's business
      e.preventDefault();
      e.target.blur();                         // fires "change"; the screen saves the value
      if (k === 38 || k === 40) dispatch(CODES[k], e);
      return;
    }

    var action = CODES[k];
    if (!action) return;
    e.preventDefault();
    dispatch(action, e);
  }

  document.addEventListener('keydown', onKeyDown);

  LL.keys = {
    register: register,
    /* Single dispatcher; the router decides who consumes the action. */
    setHandler: function (fn) { handler = fn; }
  };
})(window.LL = window.LL || {});
