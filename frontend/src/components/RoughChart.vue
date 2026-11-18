<script setup>
// Chart gaya roughness (gambar tangan) — pengganti Chart.js untuk kebutuhan
// chart aplikasi ini. Digambar langsung ke canvas memakai roughjs, jadi garis
// sumbu, bar, titik, dan irisan pie punya tekstur sketsa.
//
// Mode:
// - 'bar'      : bar chart dengan sumbu + label + tooltip hover
// - 'line'     : line chart dengan sumbu + label + tooltip hover
// - 'spark'    : sparkline polos (tanpa sumbu), untuk aksen kartu
// - 'doughnut' : pie/doughnut rough dengan hover, klik, label %, highlight
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import rough from 'roughjs';

const props = defineProps({
  type: { type: String, default: 'bar' },
  labels: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  // Warna isian/garis bar & line
  color: { type: String, default: '#f59e0b' },
  // Warna tiap irisan doughnut (opsional)
  colors: { type: Array, default: null },
  // Slice yang di-highlight doughnut (ekspansi radius)
  highlightIndex: { type: Number, default: -1 },
  // Sumbu/grid warna (default mengikuti outline tema)
  axisColor: { type: String, default: '#e2e8f0' },
  // Isi area di bawah garis (line/spark)
  filled: { type: Boolean, default: false },
  // Formatter nilai tooltip
  formatValue: { type: Function, default: (v) => v },
  // Formatter label sumbu y
  formatAxis: { type: Function, default: (v) => v }
});

const emit = defineEmits(['select', 'hover']);

const canvas = ref(null);
const tooltip = ref({ show: false, x: 0, y: 0, label: '', value: '' });
let rc = null;
let geometry = null;
let ro = null;
let drawFrame = 0;

function cssVar(name, fallback) {
  const v = getComputedStyle(canvas.value).getPropertyValue(name).trim();
  return v || fallback;
}

function draw() {
  const el = canvas.value;
  if (!el) return;
  const parent = el.parentElement;
  if (!parent || (props.type !== 'spark' && !props.labels.length) || !props.data.length) {
    if (el.getContext('2d')) el.getContext('2d').clearRect(0, 0, el.width, el.height);
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (!w || !h) return;
  el.width = w * dpr;
  el.height = h * dpr;
  el.style.width = w + 'px';
  el.style.height = h + 'px';

  const ctx = el.getContext('2d');
  ctx.clearRect(0, 0, el.width, el.height);
  if (!rc) rc = rough.canvas(el);

  const strokeColor = cssVar('--outline', props.axisColor);
  const seed = 7;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';

  if (props.type === 'doughnut') {
    drawDoughnut(ctx, w, h, seed);
  } else {
    drawCartesian(ctx, w, h, seed, strokeColor);
  }
  ctx.restore();
}

function scheduleDraw() {
  cancelAnimationFrame(drawFrame);
  drawFrame = requestAnimationFrame(draw);
}

function drawCartesian(ctx, w, h, seed, strokeColor) {
  const plain = props.type === 'spark';
  const pad = plain
    ? { top: 4, right: 4, bottom: 4, left: 4 }
    : { top: 10, right: 8, bottom: 22, left: 34 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;

  const values = props.data.map(Number).map(v => (Number.isFinite(v) ? v : 0));
  // Skala berbasis nilai absolut terbesar. Jangan pakai `Math.max(...v, 0) || 1`
  // saja: kalau seluruh nilai negatif (net pengeluaran > pemasukan, mis. hasil
  // filter "Hari Ini"), max = 0 sehingga niceMax = 1 dan koordinat polygon
  // meledak ke ratusan juta px. Hachure fill roughjs menyapu per-pixel gap
  // di rentang itu => puluhan juta iterasi => tab freeze belasan detik.
  const maxAbs = Math.max(...values.map(Math.abs), 1);
  const niceMax = plain ? maxAbs * 1.2 : (Math.max(...values, 0) * 1.15 || maxAbs * 1.15);
  const scale = (v) => {
    // Clamp agar nilai negatif/lebih besar dari skala tidak menghasilkan
    // koordinat di luar area gambar.
    const clamped = Math.max(0, Math.min(niceMax, v));
    return pad.top + ih - (clamped / niceMax) * ih;
  };

  geometry = { pad, iw, ih, niceMax, slots: [] };

  if (!plain) {
    const ticks = 3;
    for (let i = 0; i <= ticks; i++) {
      const val = (niceMax / ticks) * i;
      const y = scale(val);
      if (i > 0) {
        rc.line(pad.left, y, pad.left + iw, y, {
          stroke: strokeColor, strokeWidth: 0.7, roughness: 1.2, seed: seed + i, bowing: 1
        });
      }
      ctx.fillText(props.formatAxis(Math.round(val)), 2, y + 3);
    }
    rc.line(pad.left, pad.top + ih, pad.left + iw, pad.top + ih, {
      stroke: strokeColor, strokeWidth: 1, roughness: 1.2, seed, bowing: 1.4
    });
  }

  const n = plain ? values.length : props.labels.length;
  const slot = iw / n;
  ctx.textAlign = 'center';

  if (props.type === 'bar') {
    const bw = Math.min(slot * 0.55, 34);
    values.forEach((v, i) => {
      const x = pad.left + slot * i + (slot - bw) / 2;
      const yTop = scale(v);
      const hBar = pad.top + ih - yTop;
      if (hBar > 1) {
        rc.rectangle(x, yTop, bw, hBar, {
          fill: props.color, fillStyle: 'hachure', fillWeight: 1.6, hachureGap: 5,
          stroke: props.color, strokeWidth: 1.2, roughness: 1.8, bowing: 1.6, seed: seed + i
        });
      }
      geometry.slots.push({ cx: x + bw / 2 });
    });
  } else {
    // line & spark
    const pts = values.map((v, i) => [pad.left + slot * i + slot / 2, scale(v)]);
    if (props.filled && pts.length > 1) {
      const base = pad.top + ih;
      rc.polygon([[pts[0][0], base], ...pts, [pts[pts.length - 1][0], base]], {
        fill: props.color, fillStyle: 'hachure', fillWeight: 1.1, hachureGap: 7,
        fillWeight2: undefined, stroke: 'none', roughness: 1.5, seed: seed + 99
      });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      rc.linearPath([pts[i], pts[i + 1]], {
        stroke: props.color, strokeWidth: props.type === 'spark' ? 2 : 1.8,
        roughness: 1.6, bowing: 2.2, seed: seed + i
      });
    }
    if (props.type !== 'spark') {
      pts.forEach((p, i) => {
        rc.circle(p[0], p[1], 5, {
          stroke: props.color, strokeWidth: 1.4, fill: props.color,
          fillStyle: 'solid', roughness: 1.2, seed: seed + i
        });
      });
    }
    geometry.slots = pts.map(p => ({ cx: p[0] }));
  }

  if (!plain) {
    const step = Math.ceil(n / 8);
    props.labels.forEach((lb, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      ctx.fillText(String(lb), geometry.slots[i].cx, pad.top + ih + 14);
    });
  }
}

function drawDoughnut(ctx, w, h, seed) {
  const values = props.data.map(Number);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 14;
  const cutoutR = outerR * 0.58;

  // Sudut awal seperti Chart.js: pukul 12 (-90deg), searah jarum jam
  let angle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const a0 = angle;
    const a1 = angle + (v / total) * Math.PI * 2;
    angle = a1;
    return { a0, a1, i };
  });

  geometry = { doughnut: true, cx, cy, outerR, cutoutR, slices };

  slices.forEach(s => {
    const isHot = s.i === props.highlightIndex;
    const r = isHot ? outerR + 14 : outerR;
    const color = (props.colors && props.colors[s.i]) || props.color;
    // Seperti Chart.js: irisan digambar jadi lingkaran penuh lalu
    // "dipotong" lingkaran tengah warna kartu.
    rc.arc(cx, cy, r * 2, r * 2, s.a0 + 0.01, s.a1 - 0.01, true, {
      fill: color, fillStyle: 'solid', stroke: color, strokeWidth: 1.4,
      roughness: isHot ? 1.6 : 1.2, bowing: 1, seed: seed + s.i
    });
  });

  // "Cutout" tengah — lingkaran rough warna kartu
  rc.circle(cx, cy, cutoutR * 2, {
    fill: '#ffffff', fillStyle: 'solid', stroke: 'rgba(15,23,42,0.08)',
    strokeWidth: 1, roughness: 1.1, seed: seed + 31
  });

  // Label persentase di tengah ketebalan ring
  ctx.font = 'bold 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  slices.forEach(s => {
    const v = values[s.i];
    const pct = Math.round((v / total) * 100);
    if (pct < 2) return;
    const mid = (s.a0 + s.a1) / 2;
    const r = (cutoutR + outerR) / 2;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 2;
    ctx.fillText(pct + '%', cx + Math.cos(mid) * r, cy + Math.sin(mid) * r);
    ctx.restore();
  });
}

function doughnutHit(x, y) {
  if (!geometry || !geometry.doughnut) return -1;
  const { cx, cy, outerR, cutoutR, slices } = geometry;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.hypot(dx, dy);
  if (r > outerR + 16 || r < cutoutR * 0.9) return -1;
  let ang = Math.atan2(dy, dx);
  for (const s of slices) {
    // normalisasi agar melewati putaran -PI/2
    let a = ang;
    while (a < s.a0) a += Math.PI * 2;
    while (a > s.a1) a -= Math.PI * 2;
    if (a >= s.a0 && a <= s.a1) return s.i;
  }
  return -1;
}

function onMove(e) {
  if (!geometry) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (geometry.doughnut) {
    const idx = doughnutHit(x, y);
    emit('hover', idx >= 0 ? idx : null);
    canvas.value.style.cursor = idx >= 0 ? 'pointer' : 'default';
    return;
  }

  if (!props.labels.length) return;
  let idx = -1;
  let best = Infinity;
  geometry.slots.forEach((s, i) => {
    const d = Math.abs(s.cx - x);
    if (d < best) { best = d; idx = i; }
  });
  if (idx >= 0 && best < 60) {
    tooltip.value = {
      show: true,
      x: geometry.slots[idx].cx,
      y: rect.height * 0.15,
      label: String(props.labels[idx]),
      value: props.formatValue(props.data[idx])
    };
  } else {
    tooltip.value.show = false;
  }
}

function onClick(e) {
  if (!geometry || !geometry.doughnut) return;
  const rect = canvas.value.getBoundingClientRect();
  const idx = doughnutHit(e.clientX - rect.left, e.clientY - rect.top);
  if (idx >= 0) emit('select', idx);
}

function onLeave() {
  tooltip.value.show = false;
  if (geometry?.doughnut) emit('hover', null);
}

watch(() => [props.data, props.labels, props.type, props.color, props.colors, props.highlightIndex, props.filled], scheduleDraw, { deep: true });

onMounted(() => {
  scheduleDraw();
  ro = new ResizeObserver(scheduleDraw);
  if (canvas.value?.parentElement) ro.observe(canvas.value.parentElement);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(drawFrame);
});

defineExpose({ redraw: draw });
</script>

<template>
  <div class="relative w-full h-full">
    <canvas ref="canvas" class="absolute inset-0" @mousemove="onMove" @mouseleave="onLeave" @click="onClick"></canvas>
    <div
      v-if="tooltip.show"
      class="absolute z-10 px-2 py-1 bg-slate-900/90 text-white text-[9px] font-bold rounded-lg pointer-events-none whitespace-nowrap"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, -100%)' }"
    >
      {{ tooltip.label }}: {{ tooltip.value }}
    </div>
  </div>
</template>
