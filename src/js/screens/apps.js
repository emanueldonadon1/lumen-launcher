/*
 * All apps: grid of every app detected on the TV.
 *   OK     -> open
 *   Yellow -> add to / remove from the home shelf (★)
 * Vertical scrolling is a translate3d on the grid, never native scroll.
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var grid = null;
  var empty = null;
  var scroller = null;
  var apps = [];

  function render() {
    apps = LL.installed.list();
    var frag = document.createDocumentFragment();
    apps.forEach(function (app) {
      frag.appendChild(LL.tile.build(LL.tile.resolve(app), { starred: LL.store.isOnShelf(app.appId) }));
    });
    grid.textContent = '';
    grid.appendChild(frag);
    empty.style.display = apps.length ? 'none' : 'block';
    scroller.reset();
    LL.nav.refresh('apps.grid');
  }

  function toggleFavorite() {
    var cur = LL.nav.current();
    if (!cur || cur.zoneId !== 'apps.grid') return;
    var app = apps[cur.index];
    if (!app) return;
    var added = LL.store.toggleApp(app);
    LL.toast.show(t(added ? 'favAdded' : 'favRemoved', { name: app.title }), 1600);
    var star = cur.el.querySelector('.tile__star');
    if (added && !star) {
      star = document.createElement('span');
      star.className = 'tile__star';
      star.textContent = '★';
      cur.el.querySelector('.tile__art').appendChild(star);
    } else if (!added && star) {
      star.parentNode.removeChild(star);
    }
  }

  LL.screens = LL.screens || {};
  LL.screens.apps = {
    init: function () {
      grid = this.el.querySelector('.grid');
      empty = this.el.querySelector('.sheet__empty');
      // margin 90: room for the scaled tile and the label under it
      scroller = new LL.VScroll(this.el.querySelector('.sheet__viewport'), grid, 90);
      LL.nav.defineZone('apps.grid', {
        el: grid,
        selector: '.tile',
        orientation: 'grid',
        onFocus: function (tile) { scroller.reveal(tile); },
        onEnter: function (tile, index) {
          var app = apps[index];
          if (!app) return;
          LL.toast.show(t('opening', { name: app.title }), 1500);
          LL.launcher.launchApp(app.appId).catch(function (err) {
            LL.toast.show(t(LL.launcher.errorKey(err), { name: app.title }), 3000);
          });
        }
      });
      LL.installed.onChange(function () { if (LL.router.top() === LL.screens.apps) render(); });
    },

    onShow: function (params) {
      if (!params.restored) render();
      LL.nav.focus('apps.grid', params.restored ? undefined : 0);
    },

    onKey: function (action) {
      if (!apps.length) return action !== 'back';   // nothing to focus: only Back works
      if (action === 'yellow') { toggleFavorite(); return true; }
      return false;
    }
  };
})(window.LL = window.LL || {});
