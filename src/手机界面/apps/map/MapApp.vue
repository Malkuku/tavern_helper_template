<template>
  <main class="app-screen phone-map-screen">
    <header class="phone-map-header">
      地图 <span v-if="world?.地图索引">· 当前：{{ world.地图索引 }}</span>
    </header>

    <template v-if="Object.keys(map).length">
      <nav class="phone-map-trail" aria-label="地图层级">
        <button type="button" @click="goTo(-1)">全部</button>
        <template v-for="(entry, index) in trail" :key="entry.name">
          <span>›</span
          ><button type="button" :aria-current="index === trail.length - 1 ? 'page' : undefined" @click="goTo(index)">
            {{ entry.name }}
          </button>
        </template>
      </nav>
      <div class="phone-map-search">
        <input v-model="query" type="search" aria-label="搜索地点" placeholder="搜索地点" />
        <div v-if="query.trim()" class="phone-map-results">
          <button
            v-for="entry in results"
            :key="entry.path.map(item => item.name).join('/')"
            type="button"
            @click="jumpTo(entry.path)"
          >
            {{ entry.name }} <small>{{ entry.path.map(item => item.name).join(' / ') }}</small>
          </button>
          <p v-if="!results.length">没有匹配的地点</p>
        </div>
      </div>
      <div
        ref="canvas"
        class="phone-map-canvas"
        :aria-label="`${trail.at(-1)?.name ?? '全部地图'}地图`"
        @wheel.prevent="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="phone-map-layer" :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }">
          <div class="phone-map-grid" aria-hidden="true"></div>
          <button
            v-for="point in points"
            :key="point.name"
            :data-name="point.name"
            type="button"
            class="phone-map-point"
            :class="{ selected: selectedName === point.name, current: world?.地图索引 === point.name }"
            :style="{
              left: `calc(50% + ${point.x}px)`,
              top: `calc(50% + ${point.y}px)`,
              zIndex: Math.round(point.z * 10) + 1,
            }"
            :aria-pressed="selectedName === point.name"
            @click="selectPoint(point.name)"
            @dblclick.prevent="enterPoint(point.name)"
            @keydown.enter.prevent="enterPoint(point.name)"
          >
            <span class="phone-map-point-icon"><MapNodeIcon :svg="visible[point.name]?.图标" /></span>
            <strong>{{ point.name }}</strong>
            <small v-if="world?.地图索引 === point.name">当前位置</small>
          </button>
          <div v-if="!points.length" class="phone-map-no-points">该地区暂无下级地点</div>
        </div>
        <section v-if="selected" class="phone-map-detail" @pointerdown.stop @wheel.stop>
          <div class="phone-map-detail-head">
            <h2>{{ selectedName }}</h2>
            <button type="button" aria-label="关闭地点详情" @click="selectedName = ''">×</button>
          </div>
          <p>{{ selected.描述 || '暂无地点描述' }}</p>
          <ul v-if="selected.详情?.length">
            <li v-for="(detail, index) in selected.详情" :key="index">{{ detail }}</li>
          </ul>
          <button v-if="selectable" class="phone-map-select" type="button" @click="emit('select', selectedName)">
            分享这个位置
          </button>
        </section>
      </div>
    </template>
    <div v-else class="phone-map-empty">当前楼层暂无地图数据。</div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { 地图节点 } from '../../types';
import { findPhoneMapPath, layoutPhoneMap, listPhoneMap, type MapEntry } from './phoneMap';
import MapNodeIcon from './MapNodeIcon.vue';

const store = useMagicGirlStatStore();
const props = defineProps<{ openRequest?: { key: string; id: number } | null; selectable?: boolean }>();
const emit = defineEmits<{ select: [key: string] }>();
const map = computed(() => store.statData?.地图 ?? {});
const world = computed(() => store.statData?.世界);
const trail = ref<MapEntry[]>([]);
const selectedName = ref('');
const query = ref('');
const canvas = ref<HTMLElement>();
const canvasSize = ref({ width: 320, height: 320 });
const view = reactive({ scale: 1, x: 0, y: 0 });
const pointers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
let moved = false;
let suppressClickUntil = 0;
let lastTap = { name: '', time: 0 };
const visible = computed(() => trail.value.at(-1)?.node.子地图 ?? map.value);
const selected = computed<地图节点 | undefined>(() => visible.value[selectedName.value]);
const points = computed(() => layoutPhoneMap(visible.value, canvasSize.value.width, canvasSize.value.height));
const results = computed(() =>
  listPhoneMap(map.value)
    .filter(entry => entry.name.toLowerCase().includes(query.value.trim().toLowerCase()))
    .slice(0, 12),
);

function reset() {
  const roots = Object.entries(map.value);
  const requested = props.openRequest?.key ? findPhoneMapPath(map.value, props.openRequest.key) : undefined;
  const path = requested ?? (world.value?.地图索引 ? findPhoneMapPath(map.value, world.value.地图索引) : undefined);
  if (requested) trail.value = requested.slice(0, -1);
  else if (path && path.length > 1) trail.value = path.slice(0, -1);
  else if (roots.length === 1) trail.value = [{ name: roots[0][0], node: roots[0][1] }];
  else trail.value = [];
  selectedName.value = path && visible.value[path.at(-1)!.name] ? path.at(-1)!.name : '';
  resetView();
  void nextTick(measure);
}
function resetView() {
  Object.assign(view, { scale: 1, x: 0, y: 0 });
}
function measure() {
  if (canvas.value) canvasSize.value = { width: canvas.value.clientWidth, height: canvas.value.clientHeight };
}
function selectPoint(name: string) {
  if (Date.now() < suppressClickUntil) return;
  selectedName.value = name;
}
function enterPoint(name: string) {
  const node = visible.value[name];
  if (!node || !Object.keys(node.子地图 ?? {}).length) return;
  trail.value = [...trail.value, { name, node }];
  selectedName.value = '';
  resetView();
  void nextTick(measure);
}
function goTo(index: number) {
  trail.value = trail.value.slice(0, index + 1);
  selectedName.value = '';
  resetView();
  void nextTick(measure);
}
function jumpTo(path: MapEntry[]) {
  const target = path.at(-1);
  if (!target) return;
  trail.value = path.length === 1 && Object.keys(target.node.子地图 ?? {}).length ? path : path.slice(0, -1);
  selectedName.value = trail.value.at(-1)?.name === target.name ? '' : target.name;
  query.value = '';
  resetView();
  void nextTick(measure);
}
function zoomAt(next: number, clientX: number, clientY: number) {
  if (!canvas.value) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  const ratio = next / view.scale;
  view.x = x - (x - view.x) * ratio;
  view.y = y - (y - view.y) * ratio;
  view.scale = next;
}
function onWheel(event: WheelEvent) {
  zoomAt(Math.min(5, Math.max(0.5, view.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1))), event.clientX, event.clientY);
}
function onPointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('.phone-map-detail')) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
  moved = pointers.size > 1;
}
function onPointerMove(event: PointerEvent) {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const dx = event.clientX - previous.x;
  const dy = event.clientY - previous.y;
  if (Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) > 3) moved = true;
  if (!moved) return;
  if (moved && canvas.value && !canvas.value.hasPointerCapture(event.pointerId))
    canvas.value.setPointerCapture(event.pointerId);
  if (pointers.size === 1) {
    view.x += dx;
    view.y += dy;
  } else {
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
      const newDistance = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (oldDistance)
        zoomAt(
          Math.min(5, Math.max(0.5, (view.scale * newDistance) / oldDistance)),
          (event.clientX + other.x) / 2,
          (event.clientY + other.y) / 2,
        );
    }
  }
  pointers.set(event.pointerId, { ...previous, x: event.clientX, y: event.clientY });
}
function onPointerUp(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return;
  pointers.delete(event.pointerId);
  if (moved) {
    suppressClickUntil = Date.now() + 250;
    return;
  }
  if (event.pointerType !== 'touch') return;
  const name = (event.target as HTMLElement).closest<HTMLElement>('.phone-map-point')?.dataset.name;
  if (!name) return;
  const now = Date.now();
  if (lastTap.name === name && now - lastTap.time < 320) {
    enterPoint(name);
    lastTap = { name: '', time: 0 };
  } else lastTap = { name, time: now };
}
watch(
  () => props.openRequest?.id,
  () => {
    const key = props.openRequest?.key;
    if (!key) return;
    const path = findPhoneMapPath(map.value, key);
    if (!path) return;
    trail.value = path.slice(0, -1);
    selectedName.value = key;
    resetView();
    void nextTick(measure);
  },
  { immediate: true },
);
let observer: ResizeObserver | undefined;
watch(
  canvas,
  element => {
    observer?.disconnect();
    if (!element) return;
    observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
  },
  { flush: 'post' },
);
onUnmounted(() => observer?.disconnect());
watch(() => [map.value, world.value?.地图索引], reset, { immediate: true });
</script>

<style scoped>
.phone-map-screen {
  gap: 8px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 14px;
  overflow: hidden;
  background: #f5f7fb;
  color: #273348;
}
.phone-map-header {
  flex: none;
  padding: 2px 2px 0;
  color: #5f7393;
  font-size: 13px;
  font-weight: 700;
}
.phone-map-header span {
  font-weight: 400;
}
.phone-map-trail {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  white-space: nowrap;
}
.phone-map-trail button {
  flex: none;
  padding: 5px 3px;
  border: 0;
  background: none;
  color: #7183a1;
  font-size: 12px;
}
.phone-map-trail button[aria-current='page'] {
  color: #4168a7;
  font-weight: 800;
}
.phone-map-trail span {
  color: #adb9c9;
}
.phone-map-search {
  position: relative;
  z-index: 3;
}
.phone-map-search input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e8f1;
  border-radius: 12px;
  background: white;
  color: #273348;
  font: inherit;
  font-size: 13px;
}
.phone-map-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  padding: 5px;
  border: 1px solid #e0e8f1;
  border-radius: 12px;
  background: white;
  box-shadow: 0 10px 26px #304c7020;
}
.phone-map-results button {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px;
  border: 0;
  background: white;
  color: #273348;
  text-align: left;
  font-size: 12px;
}
.phone-map-results button:active {
  background: #eef3fa;
}
.phone-map-results small,
.phone-map-results p {
  color: #8c9bad;
  font-size: 10px;
}
.phone-map-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid #dfe8f2;
  border-radius: 23px;
  background:
    radial-gradient(circle at 25% 18%, #dff5ec 0, transparent 36%),
    radial-gradient(circle at 80% 75%, #e6e9fb 0, transparent 40%), #eaf2f7;
  touch-action: none;
}
.phone-map-layer {
  position: absolute;
  inset: 0;
  transform-origin: center;
}
.phone-map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(#9bb4c817 1px, transparent 1px), linear-gradient(90deg, #9bb4c817 1px, transparent 1px);
  background-size: 25px 25px;
  pointer-events: none;
}
.phone-map-point {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 82px;
  height: 78px;
  padding: 5px 2px;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: #34435b;
  transform: translate(-50%, -50%);
}
.phone-map-point.selected {
  background: #ffffffdd;
  box-shadow: 0 5px 16px #4d6b8b25;
}
.phone-map-point-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: #5a78ab;
  filter: drop-shadow(0 2px 2px #56739b22);
}
.phone-map-point strong {
  max-width: 78px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.phone-map-point small {
  color: #277f70;
  font-size: 9px;
  font-weight: 800;
}
.phone-map-point.current .phone-map-point-icon {
  border-radius: 50%;
  box-shadow: 0 0 0 2px #47bc9a;
}
.phone-map-no-points {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #8292a6;
  font-size: 13px;
}
.phone-map-detail {
  position: absolute;
  z-index: 5;
  left: 8px;
  right: 8px;
  bottom: 8px;
  max-height: 42%;
  overflow-y: auto;
  padding: 10px 12px;
  border: 1px solid #e4eaf1;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 4px 14px #31445c0b;
}
.phone-map-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.phone-map-detail h2 {
  margin: 0;
  font-size: 17px;
}
.phone-map-detail-head span {
  padding: 4px 8px;
  border-radius: 8px;
  background: #edf5f5;
  color: #417c78;
  font-size: 10px;
}
.phone-map-detail-head button {
  border: 0;
  background: transparent;
  color: #7183a1;
  font-size: 20px;
}
.phone-map-detail p,
.phone-map-detail li {
  color: #5e6c80;
  font-size: 12px;
  line-height: 1.6;
}
.phone-map-detail p {
  margin: 8px 0 0;
}
.phone-map-detail ul {
  margin: 8px 0 0;
  padding-left: 17px;
}
.phone-map-select {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border: 0;
  border-radius: 10px;
  background: #08a85d;
  color: white;
  font-weight: 700;
}
.phone-map-empty {
  color: #91a0b0;
  text-align: center;
  font-size: 12px;
}
.phone-map-empty {
  display: grid;
  flex: 1;
  place-items: center;
}
</style>
