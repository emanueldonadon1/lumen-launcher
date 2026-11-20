/*
 * Arrange favorites: the shelf as on the home, editable.
 *   OK         -> pick up / drop (while held, ← → move it)
 *   Red        -> remove from favorites
 *   Green      -> edit (web shortcuts)
 *   Back       -> drop (if holding), else leave
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var carousel = null;
  var empty = null;
  var holding = -1;

  function shelf() { return LL.store.get().shelf; }

  function render(focusIndex) {
    var nodes = shelf().map(function (e, i) {
      var tile = LL.tile.build(LL.tile.resolve(e));
      if (i === holding) tile.classList.add('is-held');
      return tile;
    });
    carousel.setItems(nodes);
    empty.style.display = nodes.length ? 'none' : 'block';
    if (nodes.length) LL.nav.focus('shelf.row', typeof focusIndex === 'number' ? focusIndex : undefined);
  }

  function move(dir) {
    var list = shelf().slice();
    var to = holding + dir;
    if (to < 0 || to >= list.length) return;
    var item = list.splice(holding, 1)[0];
    list.splice(to, 0, item);
    holding = to;
    LL.store.setShelf(list);     // emits 'shelf' -> home re-renders in the background
    render(to);
  }

  function drop() {
    holding = -1;
    var cur = LL.nav.current();
    render(cur ? cur.index : 0);
  }

  function removeCurrent() {
    var cur = LL.nav.current();
    if (!cur || cur.zoneId !== 'shelf.row') return;
    var list = shelf().slice();
    list.splice(cur.index, 1);
    holding = -1;
    LL.store.setShelf(list);
    LL.toast.show(t('removed'), 1400);
    render(Math.min(cur.index, list.length - 1));
  }

  function editCurrent() {
    var cur = LL.nav.current();
    if (!cur || cur.zoneId !== 'shelf.row') return;
    var entry = shelf()[cur.index];
    if (entry && entry.type === 'url') LL.router.show('editor', { entry: entry });
  }

  LL.screens = LL.screens || {};
  LL.screens.shelf = {
    init: function () {
      carousel = new LL.Carousel(this.el.querySelector('.carousel'));
      empty = this.el.querySelector('.sheet__empty');
      LL.nav.defineZone('shelf.row', {
        el: carousel.track,
        selector: '.tile',
        orientation: 'horizontal',
        onFocus: function (tile, index) { carousel.scrollTo(index); },
        onEnter: function (tile, index) {
          if (holding >= 0) { drop(); return; }
          holding = index;
          tile.classList.add('is-held');
        }
      });
    },

    onShow: function (params) {
      holding = -1;
      render(params.restored ? undefined : 0);
    },

    onKey: function (action) {
      if (!shelf().length) return action !== 'back';   // nothing to focus: only Back works
      if (holding >= 0) {
        if (action === 'left') { move(-1); return true; }
        if (action === 'right') { move(1); return true; }
        if (action === 'back') { drop(); return true; }
        if (action === 'up' || action === 'down') return true;
      }
      if (action === 'red') { removeCurrent(); return true; }
      if (action === 'green') { editCurrent(); return true; }
      return false;
    }
  };
})(window.LL = window.LL || {});
