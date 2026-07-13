// GeoFlow shared behaviour
(function () {
  // scroll progress bar
  var bar = document.querySelector('.progress');
  if (bar) {
    var paintBar = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', paintBar, { passive: true });
    paintBar();
  }

  // scroll-reveal (direction set by data-anim attr)
  var animated = document.querySelectorAll('[data-anim]');
  if ('IntersectionObserver' in window && animated.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(function (el) { el.classList.add('in'); });
  }

  // count-up numbers: <span data-count="62" data-suffix="%">
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target;
        var end = parseFloat(el.getAttribute('data-count'));
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var dur = 1200;
        var t0 = null;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = end * eased;
          el.textContent = prefix + (end % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // gentle parallax: <el data-parallax="0.15">
  var pll = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (pll.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var onScroll = function () {
      var y = window.scrollY;
      pll.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        el.style.transform = 'translateY(' + (y * speed * -1) + 'px)';
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
