<template>
  <main class="app-screen phone-map-screen">
    <header class="phone-map-header">
      <span>城市地图</span>
      <h1>地点探索</h1>
      <p>当前位置：{{ world?.地点 || world?.地图索引 || '未设置' }}</p>
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
      <div ref="canvas" class="phone-map-canvas" :aria-label="`${trail.at(-1)?.name ?? '全部地图'}地图`">
        <div class="phone-map-grid" aria-hidden="true"></div>
        <button
          v-for="point in points"
          :key="point.name"
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
        >
          <span class="phone-map-point-icon"><MapNodeIcon :svg="visible[point.name]?.图标" /></span>
          <strong>{{ point.name }}</strong>
          <small v-if="world?.地图索引 === point.name">当前位置</small>
        </button>
        <div v-if="!points.length" class="phone-map-no-points">该地区暂无下级地点</div>
      </div>
      <section v-if="selected" class="phone-map-detail">
        <div class="phone-map-detail-head">
          <h2>{{ selectedName }}</h2>
          <span>{{ selected.危机等级 || '未评级' }}</span>
        </div>
        <p>{{ selected.描述 || '暂无地点描述' }}</p>
        <p v-if="selected.危机描述" class="phone-map-crisis">{{ selected.危机描述 }}</p>
        <ul v-if="selected.详情?.length">
          <li v-for="(detail, index) in selected.详情" :key="index">{{ detail }}</li>
        </ul>
        <button v-if="Object.keys(selected.子地图 ?? {}).length" type="button" @click="enterSelected">
          查看下级地点
        </button>
      </section>
      <p v-else class="phone-map-hint">点击地图上的地点查看详情。</p>
    </template>
    <div v-else class="phone-map-empty">当前楼层暂无地图数据。</div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { 地图节点 } from '../../types';
import { findPhoneMapPath, layoutPhoneMap, listPhoneMap, type MapEntry } from './phoneMap';
import MapNodeIcon from './MapNodeIcon.vue';

const store = useMagicGirlStatStore();
const map = computed(() => store.statData?.地图 ?? {});
const world = computed(() => store.statData?.世界);
const trail = ref<MapEntry[]>([]);
const selectedName = ref('');
const query = ref('');
const canvas = ref<HTMLElement>();
const canvasSize = ref({ width: 320, height: 320 });
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
  const path = world.value?.地图索引 ? findPhoneMapPath(map.value, world.value.地图索引) : undefined;
  if (path && path.length > 1) trail.value = path.slice(0, -1);
  else if (roots.length === 1) trail.value = [{ name: roots[0][0], node: roots[0][1] }];
  else trail.value = [];
  selectedName.value = path && visible.value[path.at(-1)!.name] ? path.at(-1)!.name : '';
  void nextTick(measure);
}
function measure() {
  if (canvas.value) canvasSize.value = { width: canvas.value.clientWidth, height: canvas.value.clientHeight };
}
function selectPoint(name: string) {
  selectedName.value = name;
}
function enterSelected() {
  if (!selected.value) return;
  trail.value = [...trail.value, { name: selectedName.value, node: selected.value }];
  selectedName.value = '';
  void nextTick(measure);
}
function goTo(index: number) {
  trail.value = trail.value.slice(0, index + 1);
  selectedName.value = '';
  void nextTick(measure);
}
function jumpTo(path: MapEntry[]) {
  const target = path.at(-1);
  if (!target) return;
  trail.value = path.length === 1 && Object.keys(target.node.子地图 ?? {}).length ? path : path.slice(0, -1);
  selectedName.value = trail.value.at(-1)?.name === target.name ? '' : target.name;
  query.value = '';
  void nextTick(measure);
}
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
  gap: 10px;
  overflow-y: auto;
  background: #f5f7fb;
  color: #273348;
}
.phone-map-header {
  padding: 8px 2px 3px;
}
.phone-map-header span {
  color: #7788ad;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.phone-map-header h1 {
  margin: 4px 0;
  font-size: 27px;
}
.phone-map-header p {
  margin: 0;
  color: #78859a;
  font-size: 12px;
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
  flex: none;
  width: 100%;
  aspect-ratio: 1 / 1.02;
  overflow: hidden;
  border: 1px solid #dfe8f2;
  border-radius: 23px;
  background:
    radial-gradient(circle at 25% 18%, #dff5ec 0, transparent 36%),
    radial-gradient(circle at 80% 75%, #e6e9fb 0, transparent 40%), #eaf2f7;
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
  padding: 15px;
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
.phone-map-detail p,
.phone-map-detail li {
  color: #5e6c80;
  font-size: 12px;
  line-height: 1.6;
}
.phone-map-detail p {
  margin: 8px 0 0;
}
.phone-map-detail .phone-map-crisis {
  color: #937a5a;
}
.phone-map-detail ul {
  margin: 8px 0 0;
  padding-left: 17px;
}
.phone-map-detail button {
  margin-top: 12px;
  padding: 9px 12px;
  border: 0;
  border-radius: 10px;
  background: #587bb5;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.phone-map-hint,
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
