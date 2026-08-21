// 产线任务 UI 原型（throwaway）— 变体切换 + 滑条联动 + 假进度
// 三个变体（A 内联一体化 / B 弹窗驱动 / C 任务总览），?variant=A|B|C 可分享、可刷新保持

(function () {
  'use strict';

  var VARIANTS = [
    { key: 'A', name: 'A — 内联一体化（Single-card）' },
    { key: 'B', name: 'B — 弹窗配置 + 卡片状态（Modal-driven）' },
    { key: 'C', name: 'C — 任务总览列表（Control-center）' }
  ];

  var current = (new URLSearchParams(location.search).get('variant') || 'A').toUpperCase();
  if (!VARIANTS.some(function (v) { return v.key === current; })) current = 'A';

  function applyVariant(key) {
    document.querySelectorAll('.variant').forEach(function (el) { el.style.display = 'none'; });
    var target = document.getElementById('variant-' + key);
    if (target) target.style.display = 'block';
    var meta = VARIANTS.filter(function (v) { return v.key === key; })[0];
    document.getElementById('variant-label').textContent = meta.name;
    // 更新 URL search param，变体可分享/刷新保持
    var url = new URL(location.href);
    url.searchParams.set('variant', key);
    history.replaceState(null, '', url);
  }

  function cycle(delta) {
    var idx = VARIANTS.findIndex(function (v) { return v.key === current; });
    var next = (idx + delta + VARIANTS.length) % VARIANTS.length;
    current = VARIANTS[next].key;
    applyVariant(current);
  }

  document.getElementById('prev-variant').addEventListener('click', function () { cycle(-1); });
  document.getElementById('next-variant').addEventListener('click', function () { cycle(1); });

  // 键盘 ← → 切换（input 聚焦时不拦截）
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement && document.activeElement.isContentEditable) return;
    if (e.key === 'ArrowLeft') cycle(-1);
    if (e.key === 'ArrowRight') cycle(1);
  });

  // ── 滑条联动：批次 → 消耗/产出预览 ──
  function wireSlider(sliderSel, countTarget, costTarget, yieldTarget) {
    var slider = document.querySelector(sliderSel);
    if (!slider) return;
    function refresh() {
      var n = Number(slider.value);
      var countEl = document.querySelector(countTarget);
      if (countEl) countEl.textContent = String(n);
      if (costTarget) {
        var costEl = document.querySelector(costTarget);
        if (costEl) costEl.textContent = String(n * 2); // 每批 2 废旧金属
      }
      if (yieldTarget) {
        var yieldEl = document.querySelector(yieldTarget);
        if (yieldEl) yieldEl.textContent = String(n * 1); // 每批 1 合金板（含加成后）
      }
    }
    slider.addEventListener('input', refresh);
    refresh();
  }
  wireSlider('#variant-A input[data-slider]', '[data-var-a-count]', '[data-var-a-cost]', '[data-var-a-yield]');
  wireSlider('#variant-B input[data-slider]', '[data-var-b-count]', null, null);

  // ── 假进度动画：让「生产中」看起来是活的（仅视觉，不落库） ──
  var progress = { a: 47, b: 47 };
  setInterval(function () {
    [['a', '[data-var-a-bar]', '[data-var-a-progress]'], ['b', '[data-var-b-bar]', null]].forEach(function (cfg) {
      var k = cfg[0], barSel = cfg[1], textSel = cfg[2];
      progress[k] += 0.4;
      if (progress[k] > 100) progress[k] = 0;
      var bar = document.querySelector(barSel);
      if (bar) bar.style.width = progress[k] + '%';
      if (textSel) {
        var t = document.querySelector(textSel);
        if (t) t.textContent = Math.floor(progress[k]) + '%';
      }
    });
  }, 200);

  applyVariant(current);
})();
