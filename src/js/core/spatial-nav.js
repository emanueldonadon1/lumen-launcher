/*
 * Zone-based spatial navigation.
 *
 * Why zones instead of a global geometric search: on a 10-foot UI the user
 * expects predictable jumps ("Up from any tile goes to the top bar, and coming
 * back lands on the tile I left"). Each zone:
 *   - owns a container + item selector,
 *   - moves linearly (horizontal/vertical) or geometrically (grid),
 *   - remembers its last focused index,
 *   - declares neighbor zones per direction (string id or function).
 *
 * Focus is a CSS class (.is-focused), not DOM focus(): DOM focus triggers
 * native scrollIntoView, which fights our transform-based scrolling.
 *
 * "Never lose focus": before every move the current element is validated; if
 * it was removed/hidden, focus snaps back to the zone memory or a fallback zone.
 */
(function (LL) {
  'use strict';

  var zones = {};
  var current = null; // { zone, el, index }

  function clamp(n, min, max) { return n < min ? min : (n > max ? max : n); }

  function isUsable(el) {
    return el.getAttribute('aria-disabled') !== 'true' && el.offsetWidth > 0;
  }

  function itemsOf(zone) {
    if (!zone.el) return [];
    return Array.prototype.slice.call(zone.el.querySelectorAll(zone.selector)).filter(isUsable);
  }

  function defineZone(id, opts) {
    zones[id] = {
      id: id,
      el: opts.el,
      selector: opts.selector || '[role="button"]',
      orientation: opts.orientation || 'horizontal', // 'horizontal' | 'vertical' | 'grid'
      wrap: !!opts.wrap,
      remember: opts.remember !== false,
      neighbors: opts.neighbors || {},
      fallback: opts.fallback || null,
      lastIndex: 0,
      onFocus: opts.onFocus || null,
      onBlur: opts.onBlur || null,
      onEnter: opts.onEnter || null
    };
    return zones[id];
  }

  function applyFocus(zone, el, index) {
    if (current && current.el === el) { current.index = index; return; }
    var prev = current;
    if (prev) {
      prev.el.classList.remove('is-focused');
      if (prev.zone.onBlur) prev.zone.onBlur(prev.el, prev.index);
    }
    el.classList.add('is-focused');
    zone.lastIndex = index;
    current = { zone: zone, el: el, index: index };
    if (zone.onFocus) zone.onFocus(el, index);
  }

  /* Focus a zone at `index`, or at its remembered position. */
  function focusZone(id, index) {
    var zone = zones[id];
    if (!zone) return false;
    var list = itemsOf(zone);
    if (!list.length) return false;
    if (typeof index !== 'number') index = zone.remember ? zone.lastIndex : 0;
    index = clamp(index, 0, list.length - 1);
    applyFocus(zone, list[index], index);
    return true;
  }

  function linearNext(zone, list, idx, dir) {
    var step = 0;
    if (zone.orientation === 'horizontal') {
      if (dir === 'right') step = 1; else if (dir === 'left') step = -1;
    } else {
      if (dir === 'down') step = 1; else if (dir === 'up') step = -1;
    }
    if (!step) return -1;
    var next = idx + step;
    if (next < 0 || next >= list.length) {
      if (!zone.wrap) return -1;
      next = (next + list.length) % list.length;
    }
    return next;
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Nearest item in a direction; off-axis distance weighs double. */
  function geometricNext(list, fromEl, dir) {
    var from = centerOf(fromEl);
    var best = -1;
    var bestScore = Infinity;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === fromEl) continue;
      var c = centerOf(list[i]);
      var dx = c.x - from.x;
      var dy = c.y - from.y;
      var main, cross;
      if (dir === 'left') { main = -dx; cross = dy; }
      else if (dir === 'right') { main = dx; cross = dy; }
      else if (dir === 'up') { main = -dy; cross = dx; }
      else { main = dy; cross = dx; }
      if (main <= 1) continue;
      var score = main + Math.abs(cross) * 2;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  function ensureValid() {
    if (current && current.el.isConnected && isUsable(current.el)) return true;
    if (current) {
      if (focusZone(current.zone.id)) return true;
      if (current.zone.fallback && focusZone(current.zone.fallback)) return true;
    }
    return false;
  }

  function move(dir) {
    if (!ensureValid()) return false;
    var zone = current.zone;
    var list = itemsOf(zone);
    var idx = list.indexOf(current.el);
    var next = zone.orientation === 'grid'
      ? geometricNext(list, current.el, dir)
      : linearNext(zone, list, idx, dir);

    if (next >= 0) {
      applyFocus(zone, list[next], next);
      return true;
    }

    var target = zone.neighbors[dir];
    if (typeof target === 'function') target = target(current.el, current.index);
    return !!target && focusZone(target);
  }

  function enter() {
    if (!ensureValid()) return false;
    if (current.zone.onEnter) current.zone.onEnter(current.el, current.index);
    return true;
  }

  /* Call after re-rendering a zone's items: keeps the focused index. */
  function refresh(id) {
    if (current && current.zone.id === id) focusZone(id, current.index);
  }

  LL.nav = {
    defineZone: defineZone,
    focus: focusZone,
    move: move,
    enter: enter,
    refresh: refresh,
    current: function () {
      return current ? { zoneId: current.zone.id, el: current.el, index: current.index } : null;
    }
  };
})(window.LL = window.LL || {});
