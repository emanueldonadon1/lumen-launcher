/*
 * Screen stack. Each screen object may implement:
 *   init(), onShow(params), onHide(), onKey(action, e) -> true if consumed,
 *   onBack() -> true if consumed.
 * Screens with `overlay: true` (side panels) keep the screen below visible,
 * dimmed with .is-covered.
 * Back on the root screen does nothing on purpose: a launcher should not close
 * itself. The system Home/Exit keys still leave the app.
 */
(function (LL) {
  'use strict';

  var screens = {};
  var stack = [];

  function top() { return stack[stack.length - 1] || null; }

  function register(id, screen) {
    screen.id = id;
    screen.el = document.querySelector('[data-screen="' + id + '"]');
    screens[id] = screen;
    if (screen.init) screen.init();
  }

  function activate(screen, params) {
    screen.el.classList.remove('is-covered');
    screen.el.classList.add('is-active');
    if (screen.onShow) screen.onShow(params || {});
  }

  function deactivate(screen) {
    screen.el.classList.remove('is-active');
    if (screen.onHide) screen.onHide();
  }

  function show(id, params) {
    var next = screens[id];
    if (!next) throw new Error('[router] unknown screen: ' + id);
    var prev = top();
    if (prev === next) return;
    if (prev) {
      if (next.overlay) {
        prev.el.classList.add('is-covered');
        if (prev.onHide) prev.onHide();
      } else {
        deactivate(prev);
      }
    }
    stack.push(next);
    activate(next, params);
  }

  function back() {
    var s = top();
    if (!s) return;
    if (s.onBack && s.onBack() === true) return;
    if (stack.length > 1) {
      deactivate(stack.pop());
      activate(top(), { restored: true });
    }
  }

  /* Back to the root screen (e.g. after saving from a deep screen). */
  function home() {
    while (stack.length > 1) deactivate(stack.pop());
    activate(top(), { restored: true });
  }

  function handleKey(action, e) {
    var s = top();
    if (!s) return;
    if (s.onKey && s.onKey(action, e) === true) return;
    switch (action) {
      case 'left': case 'right': case 'up': case 'down':
        LL.nav.move(action); break;
      case 'enter':
        LL.nav.enter(); break;
      case 'back':
        back(); break;
    }
  }

  LL.router = { register: register, show: show, back: back, home: home, handleKey: handleKey, top: top };
})(window.LL = window.LL || {});
