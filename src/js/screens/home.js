/*
 * Home (Google TV style): clock + top actions, then rows:
 *   Favorites  (your shelf + "+")
 *   Trending   (TMDB picks on your apps - only with a TMDB key)
 *   Recent     (last opened apps/shortcuts)
 *
 * Zones: home.top <-> home.row.<id>, rows stacked vertically. Moving down
 * slides the whole page up (transform) so the focused row takes the first
 * row's place; the header fades out.
 *
 * Keys: Red theme · Green all apps · Yellow inputs · Blue settings · 1-9 open favorite N
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var screenEl = null;
  var page = null;
  var chip = null;
  var rows = {};          // id -> { el, carousel, items, visible }
  var ORDER = ['favorites', 'picks', 'recents'];
  var pageY = -1;

  function pressFeedback(el) {
    el.classList.add('is-pressed');
    setTimeout(function () { el.classList.remove('is-pressed'); }, 140);
  }

  function visibleRows() {
    return ORDER.filter(function (id) { return rows[id].visible; });
  }

  /* ---------- Row content ---------- */

  function favoritesItems() {
    return LL.store.get().shelf.filter(function (e) {
      // An app uninstalled since it was pinned disappears, unless detection itself failed
      return e.type === 'url' || LL.installed.get(e.target) || !LL.installed.list().length;
    });
  }

  function renderRow(id) {
    var row = rows[id];
    var nodes;
    if (id === 'favorites') {
      row.items = favoritesItems();
      nodes = row.items.map(function (e) { return LL.tile.build(LL.tile.resolve(e)); });
      var add = LL.tile.buildAdd(t('addApp'));
      add.setAttribute('data-add', '1');
      nodes.push(add);
      row.visible = true;
    } else if (id === 'picks') {
      row.items = LL.picks.list().filter(function (p) { return LL.picks.appFor(p); });
      nodes = row.items.map(function (p) { return LL.tile.buildPoster(p, LL.picks.appFor(p)); });
      row.visible = nodes.length > 0;
    } else {
      var s = LL.store.get();
      row.items = s.settings.showRecents ? s.recents.filter(function (e) {
        return e.type === 'url' || LL.installed.get(e.target);
      }) : [];
      nodes = row.items.map(function (e) { return LL.tile.build(LL.tile.resolve(e)); });
      row.visible = nodes.length > 0;
    }
    row.el.style.display = row.visible ? '' : 'none';
    row.carousel.setItems(nodes);
    LL.nav.refresh('home.row.' + id);
  }

  function renderAll() { ORDER.forEach(renderRow); }

  function renderChip() {
    var w = LL.weather.get();
    var on = LL.store.get().settings.weather && w;
    chip.style.display = on ? '' : 'none';
    if (!on) return;
    chip.querySelector('.wchip__icon').innerHTML = LL.wicons.icon(w.code, w.isDay);   // static SVG template
    chip.querySelector('.wchip__temp').textContent = LL.weather.temp(w.temp);
  }

  /* ---------- Opening things ---------- */

  function openEntry(entry) {
    var name = LL.tile.resolve(entry).name;
    LL.toast.show(t('opening', { name: name }), 1500);
    LL.launcher.open(entry).catch(function (err) {
      console.warn('[home] launch failed', entry.target, err);
      LL.toast.show(t(LL.launcher.errorKey(err), { name: name }), 3000);
    });
  }

  function onRowEnter(id) {
    return function (tile, index) {
      pressFeedback(tile);
      var row = rows[id];
      if (id === 'favorites' && tile.getAttribute('data-add')) { LL.router.show('apps'); return; }
      if (id === 'picks') {
        var pick = row.items[index];
        var app = pick && LL.picks.appFor(pick);
        if (!app) return;
        LL.toast.show(t('openingIn', { title: pick.title, name: app.title }), 2200);
        LL.launcher.launchApp(app.appId).catch(function (err) {
          LL.toast.show(t(LL.launcher.errorKey(err), { name: app.title }), 3000);
        });
        return;
      }
      if (row.items[index]) openEntry(row.items[index]);
    };
  }

  function onTopEnter(el) {
    pressFeedback(el);
    var action = el.getAttribute('data-action');
    if (action === 'weather') LL.router.show('weather');
    else if (action === 'inputs') LL.router.show('inputs');
    else if (action === 'apps') LL.router.show('apps');
    else if (action === 'settings') LL.router.show('settings');
  }

  function cycleTheme() {
    var next = LL.theme.cycle();
    LL.toast.show(t('theme_' + next), 1500);
  }

  /* ---------- Vertical page movement ---------- */

  function setPage(rowId) {
    var vis = visibleRows();
    var idx = rowId ? vis.indexOf(rowId) : -1;
    var y = 0;
    if (idx > 0) y = rows[rowId].el.offsetTop - rows[vis[0]].el.offsetTop;
    screenEl.classList.toggle('is-scrolled', idx > 0);
    if (y === pageY) return;
    pageY = y;
    page.style.transform = y ? 'translate3d(0,' + (-y) + 'px,0)' : '';
  }

  function neighbor(id, dir) {
    return function () {
      var vis = visibleRows();
      var i = vis.indexOf(id) + (dir === 'down' ? 1 : -1);
      if (i < 0) return 'home.top';
      return i < vis.length ? 'home.row.' + vis[i] : null;
    };
  }

  LL.screens = LL.screens || {};
  LL.screens.home = {
    init: function () {
      screenEl = this.el;
      page = this.el.querySelector('.home__page');
      chip = this.el.querySelector('.wchip');

      LL.nav.defineZone('home.top', {
        el: this.el.querySelector('.topbar__actions'),
        orientation: 'horizontal',
        neighbors: { down: 'home.row.favorites' },
        fallback: 'home.row.favorites',
        onFocus: function () { setPage(null); },
        onEnter: onTopEnter
      });

      ORDER.forEach(function (id) {
        var el = screenEl.querySelector('[data-row="' + id + '"]');
        var carousel = new LL.Carousel(el.querySelector('.carousel'));
        rows[id] = { el: el, carousel: carousel, items: [], visible: id === 'favorites' };
        LL.nav.defineZone('home.row.' + id, {
          el: carousel.track,
          selector: '.tile',
          orientation: 'horizontal',
          neighbors: { up: neighbor(id, 'up'), down: neighbor(id, 'down') },
          fallback: 'home.row.favorites',
          onFocus: function (tile, index) { carousel.scrollTo(index); setPage(id); },
          onEnter: onRowEnter(id)
        });
      });

      renderAll();
      renderChip();
      LL.store.on(function (topic) {
        if (topic === 'shelf') renderRow('favorites');
        else if (topic === 'recents') renderRow('recents');
        else if (topic === 'settings') { renderChip(); renderRow('recents'); }
      });
      LL.installed.onChange(renderAll);
      LL.picks.onChange(function () { renderRow('picks'); });
      LL.weather.onChange(renderChip);
    },

    onShow: function (params) {
      if (params.restored && this.lastZone) { LL.nav.focus(this.lastZone); return; }
      LL.nav.focus('home.row.favorites');
    },

    onHide: function () {
      var cur = LL.nav.current();
      this.lastZone = cur ? cur.zoneId : 'home.row.favorites';
    },

    onKey: function (action) {
      if (action === 'red') { cycleTheme(); return true; }
      if (action === 'green') { LL.router.show('apps'); return true; }
      if (action === 'yellow') { LL.router.show('inputs'); return true; }
      if (action === 'blue') { LL.router.show('settings'); return true; }
      if (action.indexOf('num') === 0) {
        var n = +action.slice(3);
        var fav = rows.favorites.items[(n === 0 ? 10 : n) - 1];
        if (fav) openEntry(fav);
        return true;
      }
      return false;
    }
  };
})(window.LL = window.LL || {});
