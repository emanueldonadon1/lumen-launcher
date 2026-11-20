/*
 * Bootstrap.
 * Boot screen rules:
 *  - The animation is pure CSS and already running before this file executes.
 *  - It stays at least BOOT_MIN_MS (measured from navigation start) AND until
 *    the home is ready (installed apps read, wallpaper decoded), then
 *    cross-fades into the home. Weather/picks never hold the boot: they fill in
 *    when they arrive (from cache instantly when available).
 *  - Enter/Back skip it. It is skipped entirely when disabled in settings or
 *    when the app was pre-launched hidden (prelaunch.support).
 *  - The boot DOM is removed afterwards to free its compositor layers.
 */
(function (LL) {
  'use strict';

  var BOOT_MIN_MS = 1900;
  var READY_TIMEOUT_MS = 2500;
  var booting = true;

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, delay(ms)]);
  }

  function finishBoot() {
    if (!booting) return;
    booting = false;
    var boot = document.getElementById('boot');
    document.body.classList.remove('is-booting');
    document.body.classList.add('is-ready');
    if (!boot) return;
    boot.classList.add('is-leaving');
    setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 600);
  }

  function onKey(action, e) {
    if (booting) {
      if (action === 'enter' || action === 'back') finishBoot();
      return;
    }
    if (LL.saver.poke()) return;          // the key only woke the screensaver up
    LL.router.handleKey(action, e);
  }

  function start() {
    var state = LL.store.load();

    LL.platform.applyTier(state.settings.perf);
    LL.keys.register();
    LL.i18n.apply(document);
    LL.theme.apply();
    LL.store.on(function (topic) {
      if (topic === 'settings') { LL.theme.apply(); LL.clock.refresh(); }
    });

    LL.clock.bind({
      time: document.getElementById('clock-time'),
      date: document.getElementById('clock-date'),
      greeting: document.getElementById('clock-greeting')
    });
    LL.saver.init();

    ['home', 'apps', 'settings', 'shelf', 'editor', 'weather', 'inputs', 'city'].forEach(function (id) {
      LL.router.register(id, LL.screens[id]);
    });
    LL.router.show('home');
    LL.keys.setHandler(onKey);

    // Background data: weather (30 min cache) and TMDB picks (6 h cache)
    LL.weather.refresh();
    LL.clock.onMinute(function () { LL.weather.refresh(); LL.picks.refresh(); });
    LL.clock.start();

    var appsReady = LL.installed.load().then(function () {
      LL.store.seedShelf();
      LL.picks.refresh();
    });

    var animate = state.settings.bootAnimation && !document.hidden;
    var elapsed = window.performance ? performance.now() : 0;
    var wait = animate ? Math.max(0, BOOT_MIN_MS - elapsed) : 0;
    var bootEl = document.getElementById('boot');
    if (!animate && bootEl) bootEl.classList.add('is-silent');   // plain black while apps load

    Promise.all([
      delay(wait),
      withTimeout(appsReady, READY_TIMEOUT_MS),
      LL.theme.preload(READY_TIMEOUT_MS)
    ]).then(finishBoot, finishBoot);
  }

  try {
    start();
  } catch (e) {
    // Never leave the user stuck on the boot screen.
    console.error('[main] startup failed', e);
    finishBoot();
  }
})(window.LL = window.LL || {});
