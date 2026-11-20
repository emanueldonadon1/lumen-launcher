/*
 * Vertical "scroll" for lists taller than their viewport: translate3d on the
 * inner element so the focused child stays fully visible. No native scroll.
 */
(function (LL) {
  'use strict';

  function VScroll(viewport, inner, margin) {
    this.viewport = viewport;
    this.inner = inner;
    this.margin = margin || 24;
    this.y = 0;
  }

  VScroll.prototype.reveal = function (el) {
    var viewH = this.viewport.clientHeight;
    var top = el.offsetTop - this.margin;
    var bottom = el.offsetTop + el.offsetHeight + this.margin;
    var y = this.y;
    if (top < y) y = Math.max(0, top);
    else if (bottom > y + viewH) y = bottom - viewH;
    if (y === this.y) return;
    this.y = y;
    this.inner.style.transform = 'translate3d(0,' + (-y) + 'px,0)';
  };

  VScroll.prototype.reset = function () {
    this.y = 0;
    this.inner.style.transform = '';
  };

  LL.VScroll = VScroll;
})(window.LL = window.LL || {});
