/*
 * Horizontal row scrolled only via translate3d on the track (compositor-only).
 * Focused tile is anchored to the row's left edge (Google TV behaviour), and
 * the track stops at the end so the last tile keeps a right safe margin.
 * Geometry is measured once per render - never during navigation.
 */
(function (LL) {
  'use strict';

  function Carousel(root) {
    this.root = root;
    this.track = root.querySelector('.carousel__track');
    this.step = 0;
    this.max = 0;
    this.offset = -1;
  }

  Carousel.prototype.setItems = function (nodes) {
    var frag = document.createDocumentFragment();
    nodes.forEach(function (n) { frag.appendChild(n); });
    this.track.textContent = '';
    this.track.appendChild(frag);
    this.measure();
  };

  Carousel.prototype.measure = function () {
    var first = this.track.firstElementChild;
    if (!first) { this.step = 0; this.max = 0; return; }
    var cs = window.getComputedStyle(first);
    this.step = first.offsetWidth + parseFloat(cs.marginRight);
    var safeRight = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--safe-x')) || 0;
    // Real content width (scrollWidth is never smaller than the track itself, so short rows would "scroll")
    var last = this.track.lastElementChild;
    var contentW = last.offsetLeft + last.offsetWidth;
    this.max = Math.max(0, contentW + safeRight - this.root.clientWidth);
    this.offset = -1;
  };

  Carousel.prototype.scrollTo = function (index) {
    var x = Math.min(index * this.step, this.max);
    if (x === this.offset) return;
    this.offset = x;
    this.track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
  };

  LL.Carousel = Carousel;
})(window.LL = window.LL || {});
