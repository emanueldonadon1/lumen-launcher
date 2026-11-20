/*
 * Persistent state in localStorage, with a schema version so future releases
 * migrate saved data instead of wiping the user's favorites.
 *
 * shelf / recents entries:
 *   { type: 'app', target: '<Tizen app id>', name: '<last known title>' }
 *   { type: 'url', id: 'u-…', target: 'https://…', name: '…', color: '#rrggbb' }
 */
(function (LL) {
  'use strict';

  var KEY = 'lumen.state';
  var VERSION = 3;
  var SHELF_SEED_SIZE = 8;
  var MAX_RECENTS = 10;
  var state = null;
  var listeners = [];

  function defaults() {
    return {
      version: VERSION,
      seeded: false,          // first-run shelf filled from the detected apps?
      shelf: [],
      recents: [],
      settings: {
        theme: 'auto',        // 'auto' (day/night) | 'night' | 'photo' | 'oled'
        wallpaperUrl: '',     // custom image URL; '' = theme background
        place: null,          // { city, lat, lon, country } or null = from the TV's time zone
        weather: true,
        tempUnit: 'auto',     // 'auto' | 'c' | 'f'
        saver: 10,            // screensaver after N idle minutes; 0 = off
        dim: 'off',           // 'off' | 'low' | 'medium' | 'high' | 'auto'
        tmdbKey: '',
        showPicks: true,
        showRecents: true,
        bootAnimation: true,
        clock24h: true,
        perf: 'auto'          // 'auto' | 'full' | 'lite'
      }
    };
  }

  function migrate(saved) {
    if (!saved || typeof saved !== 'object') return null;
    var d = defaults();
    if (!saved.version || saved.version < 2) {
      // v1 shipped hardcoded app ids ("d-*") that are wrong on many TVs: keep only custom entries.
      saved.shelf = (Array.isArray(saved.apps) ? saved.apps : []).filter(function (a) {
        return a && a.id && a.id.indexOf('d-') !== 0;
      });
      delete saved.apps;
      saved.seeded = false;
    }
    if (saved.version < 3 && saved.settings && saved.settings.theme === 'wallpaper') saved.settings.theme = 'auto';
    if (!Array.isArray(saved.shelf)) saved.shelf = [];
    if (!Array.isArray(saved.recents)) saved.recents = [];
    saved.settings = Object.assign({}, d.settings, saved.settings || {});
    saved.version = VERSION;
    return saved;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) state = migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('[store] could not read saved state, using defaults', e);
    }
    if (!state) state = defaults();
    return state;
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('[store] could not save state', e); }
  }

  function emit(topic) {
    listeners.forEach(function (fn) { fn(topic, state); });
  }

  function get() { return state || load(); }

  function sameEntry(a, b) {
    return a.type === b.type && (a.type === 'url' ? a.id === b.id : a.target === b.target);
  }

  function setShelf(shelf) {
    get().shelf = shelf;
    save();
    emit('shelf');
  }

  LL.store = {
    load: load,
    get: get,

    setSetting: function (key, value) {
      get().settings[key] = value;
      save();
      emit('settings');
    },

    setShelf: setShelf,

    /* First run: fill the shelf with the well-known apps found on the TV. */
    seedShelf: function () {
      var s = get();
      if (s.seeded) return false;
      var picks = LL.installed.suggested(SHELF_SEED_SIZE);
      if (!picks.length) return false;     // detection failed: try again next start
      s.seeded = true;
      setShelf(picks.map(function (a) { return { type: 'app', target: a.appId, name: a.title }; }));
      return true;
    },

    isOnShelf: function (appId) {
      return get().shelf.some(function (e) { return e.type === 'app' && e.target === appId; });
    },

    toggleApp: function (app) {
      var shelf = get().shelf.slice();
      var entry = { type: 'app', target: app.appId, name: app.title };
      var i = -1;
      shelf.forEach(function (e, idx) { if (sameEntry(e, entry)) i = idx; });
      if (i >= 0) shelf.splice(i, 1); else shelf.push(entry);
      setShelf(shelf);
      return i < 0;
    },

    upsertUrl: function (entry) {
      var shelf = get().shelf.slice();
      if (!entry.id) entry.id = 'u-' + Date.now().toString(36);
      var i = -1;
      shelf.forEach(function (e, idx) { if (sameEntry(e, entry)) i = idx; });
      if (i >= 0) shelf[i] = entry; else shelf.push(entry);
      setShelf(shelf);
    },

    /* Most recent first, no duplicates. */
    addRecent: function (entry) {
      var s = get();
      var clean = { type: entry.type, target: entry.target, name: entry.name };
      if (entry.type === 'url') { clean.id = entry.id; clean.color = entry.color; }
      s.recents = [clean].concat(s.recents.filter(function (e) { return !sameEntry(e, clean); })).slice(0, MAX_RECENTS);
      save();
      emit('recents');
    },

    reset: function () {
      state = defaults();
      save();
      LL.http.cacheClear();
      emit('settings');
      emit('shelf');
      emit('recents');
    },

    on: function (fn) { listeners.push(fn); }
  };
})(window.LL = window.LL || {});
