<template>
  <div class="vision">
    <div
      ref="viewport"
      class="viewport"
      @wheel.prevent="wheel"
      @mousedown="down"
      @mousemove="move"
      @mouseup="up"
      @mouseleave="up"
      @touchstart="touchStart"
      @touchmove.prevent="touchMove"
      @touchend="touchEnd"
      @click="background"
    >
      <div class="layer" :style="translateStyle">
        <div class="grid" :style="gridStyle"></div>
        <div
          v-for="node in nodes"
          :key="node.name"
          class="node"
          :class="{ here: node.name === currentLocation }"
          :style="nodeStyle(node)"
          @click.stop="focus = node"
        >
          <div class="icon" :class="sizeClass"><MapSvgIcon :svg="node.icon" /></div>
          <span>{{ node.name }}</span
          ><i v-if="node.name === currentLocation">YOU</i>
        </div>
      </div>
    </div>
    <div class="overlay">
      <nav>
        <button v-for="(crumb, index) in trail" :key="crumb.name" @click="navigate(index)">{{ crumb.name }}</button>
      </nav>
      <div class="search">
        <button @click="searchOpen = !searchOpen">🔍 搜索节点</button>
        <div v-if="searchOpen">
          <input v-model="query" placeholder="输入地点名称" /><button
            v-for="item in results"
            :key="item.name + item.path.join('/')"
            @click="jump(item)"
          >
            {{ item.name }}<small>{{ item.path.join(' / ') }}</small>
          </button>
        </div>
      </div>
      <slot name="hud" />
    </div>
    <button v-if="trail.length > 1" class="back" @click="goUp">← LEAVE {{ trail.at(-1)?.name }}</button>
    <aside v-if="focus" class="detail">
      <button class="close" @click="focus = undefined">×</button>
      <h3>{{ focus.name }}</h3>
      <p>{{ focus.desc }}</p>
      <small>N:{{ focus.displayX.toFixed(1) }} E:{{ focus.displayY.toFixed(1) }}</small>
      <ul>
        <li v-for="item in focus.details.slice(0, 3)" :key="item">{{ item }}</li>
      </ul>
      <footer>
        <button v-if="focus.hasChildren" class="primary" @click="enter(focus)">进入地区</button
        ><button v-if="mode === 'selection'" class="primary" @click="$emit('select', focus.name)">确定选择</button
        ><button v-if="mode === 'gameplay'" @click="$emit('travel', focus.name)">前往此处</button
        ><button
          v-if="mode === 'gameplay'"
          class="danger"
          @click="
            $emit(
              'delete',
              focus.name,
              trail.map(x => x.name),
            )
          "
        >
          删除地图
        </button>
      </footer>
    </aside>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import MapSvgIcon from './MapSvgIcon.vue';
type Mode = 'gameplay' | 'preview' | 'selection';
type Crumb = { name: string; node: Record<string, any> };
type NodeView = {
  name: string;
  displayX: number;
  displayY: number;
  z: number;
  desc: string;
  details: string[];
  icon: string;
  hasChildren: boolean;
  originalData: Record<string, any>;
};
const props = withDefaults(defineProps<{ map: Record<string, any>; mode?: Mode; currentLocation?: string }>(), {
  mode: 'preview',
  currentLocation: '',
});
defineEmits<{ select: [name: string]; travel: [name: string]; delete: [name: string, path: string[]] }>();
const viewport = ref<HTMLElement>(),
  trail = ref<Crumb[]>([]),
  root = ref<Record<string, any>>(),
  focus = ref<NodeView>(),
  transform = reactive({ k: 1, x: 0, y: 0 }),
  baseScale = ref(1),
  drag = reactive({ active: false, moved: false, x: 0, y: 0, tx: 0, ty: 0 });
const searchOpen = ref(false),
  query = ref(''),
  pinch = reactive({ active: false, distance: 0 });
function findPath(nodes: Record<string, any>, target: string, path: Crumb[] = []): Crumb[] | undefined {
  for (const [name, node] of Object.entries(nodes ?? {})) {
    const next = [...path, { name, node: node as Record<string, any> }];
    if (name === target) return next;
    const found = findPath((node as any).子地图, target, next);
    if (found) return found;
  }
}
function init() {
  const first = Object.entries(props.map ?? {})[0] as [string, Record<string, any>] | undefined;
  if (!first) {
    trail.value = [];
    root.value = undefined;
    return;
  }
  const path = props.currentLocation ? findPath(props.map, props.currentLocation) : undefined;
  trail.value = path && path.length > 1 ? path.slice(0, -1) : [{ name: first[0], node: first[1] }];
  root.value = trail.value.at(-1)!.node;
  focus.value = undefined;
  nextTick(fit);
}
const nodes = computed<NodeView[]>(() =>
  Object.entries(root.value?.子地图 ?? {}).map(([name, value]) => {
    const v = value as any,
      x = v.方位?.x ?? [0, 0],
      y = v.方位?.y ?? [0, 0],
      z = v.方位?.z ?? [0, 0];
    return {
      name,
      displayX: (x[0] + x[1]) / 2,
      displayY: (y[0] + y[1]) / 2,
      z: (z[0] + z[1]) / 2,
      desc: v.描述 ?? '',
      details: Array.isArray(v.详情) ? v.详情 : [],
      icon: v.图标 ?? '',
      hasChildren: Boolean(v.子地图),
      originalData: v,
    };
  }),
);
const allNodes = computed(() => {
  const out: { name: string; path: string[]; crumbs: Crumb[] }[] = [];
  const walk = (map: Record<string, any>, crumbs: Crumb[]) => {
    for (const [name, node] of Object.entries(map ?? {})) {
      const next = [...crumbs, { name, node: node as Record<string, any> }];
      out.push({ name, path: next.map(x => x.name), crumbs: next });
      walk((node as any).子地图 ?? {}, next);
    }
  };
  walk(props.map, []);
  return out;
});
const results = computed(() =>
  query.value.trim()
    ? allNodes.value.filter(x => x.name.toLowerCase().includes(query.value.trim().toLowerCase())).slice(0, 12)
    : [],
);
const translateStyle = computed(() => ({ '--map-translate': `translate(${transform.x}px,${transform.y}px)` })),
  gridStyle = computed(() => ({ '--map-grid-size': `${100 * transform.k}px ${100 * transform.k}px` })),
  sizeClass = computed(() => (baseScale.value > 40 ? 'large' : baseScale.value < 2 ? 'small' : 'medium'));
const nodeStyle = (n: NodeView) => {
  const scale = baseScale.value * transform.k;
  return {
    '--map-node-left': `calc(50% + ${n.displayY * scale}px)`,
    '--map-node-top': `calc(50% + ${-n.displayX * scale}px)`,
    '--map-node-z': Math.floor(n.z * 100) + 10,
  };
};
function fit() {
  if (!viewport.value || !nodes.value.length) return;
  const rect = viewport.value.getBoundingClientRect(),
    xs = nodes.value.map(n => n.displayX),
    ys = nodes.value.map(n => n.displayY),
    dx = Math.max(Math.max(...xs) - Math.min(...xs), 10),
    dy = Math.max(Math.max(...ys) - Math.min(...ys), 10);
  baseScale.value = Math.min(Math.max(Math.min(rect.width / dy, rect.height / dx) * 0.75, 0.5), 150);
  transform.k = 1;
  transform.x = (-(Math.min(...ys) + Math.max(...ys)) / 2) * baseScale.value;
  transform.y = ((Math.min(...xs) + Math.max(...xs)) / 2) * baseScale.value;
}
function wheel(e: WheelEvent) {
  if (!viewport.value) return;
  const r = viewport.value.getBoundingClientRect(),
    x = e.clientX - r.left - r.width / 2,
    y = e.clientY - r.top - r.height / 2,
    next = Math.min(Math.max(transform.k * (1 + 0.1 * -Math.sign(e.deltaY)), 0.1), 10),
    ratio = next / transform.k;
  transform.x = x - (x - transform.x) * ratio;
  transform.y = y - (y - transform.y) * ratio;
  transform.k = next;
}
function down(e: MouseEvent) {
  Object.assign(drag, { active: true, moved: false, x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y });
}
function move(e: MouseEvent) {
  if (!drag.active) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 3) drag.moved = true;
  transform.x = drag.tx + dx;
  transform.y = drag.ty + dy;
}
function up() {
  drag.active = false;
}
function touchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    pinch.active = true;
    pinch.distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
  } else if (e.touches.length === 1) down(e.touches[0] as unknown as MouseEvent);
}
function touchMove(e: TouchEvent) {
  if (e.touches.length === 2 && pinch.active) {
    const distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    transform.k = Math.min(Math.max((transform.k * distance) / pinch.distance, 0.1), 10);
    pinch.distance = distance;
  } else if (e.touches.length === 1) move(e.touches[0] as unknown as MouseEvent);
}
function touchEnd() {
  pinch.active = false;
  up();
}
function background() {
  if (!drag.moved) focus.value = undefined;
}
function enter(n: NodeView) {
  trail.value.push({ name: n.name, node: n.originalData });
  root.value = n.originalData;
  focus.value = undefined;
  nextTick(fit);
}
function navigate(index: number) {
  trail.value = trail.value.slice(0, index + 1);
  root.value = trail.value.at(-1)!.node;
  focus.value = undefined;
  nextTick(fit);
}
function goUp() {
  navigate(trail.value.length - 2);
}
function jump(item: { crumbs: Crumb[] }) {
  const parent = item.crumbs.length > 1 ? item.crumbs.slice(0, -1) : item.crumbs;
  trail.value = parent;
  root.value = parent.at(-1)?.node;
  focus.value = undefined;
  searchOpen.value = false;
  nextTick(fit);
}
let observer: ResizeObserver | undefined;
onMounted(() => {
  init();
  if (viewport.value) {
    observer = new ResizeObserver(fit);
    observer.observe(viewport.value);
  }
});
onUnmounted(() => observer?.disconnect());
watch(() => [props.map, props.currentLocation], init);
</script>
<style scoped>
.vision {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 360px !important;
  overflow: hidden !important;
  background: radial-gradient(circle at center, #2a2f3a, #15171c);
  color: #ddd;
  user-select: none;
}
.viewport {
  position: absolute !important;
  inset: 0 !important;
  cursor: crosshair;
}
.layer {
  position: absolute !important;
  width: 100% !important;
  height: 100% !important;
  transform: var(--map-translate) !important;
}
.grid {
  position: absolute;
  inset: -200%;
  width: 500%;
  height: 500%;
  opacity: 0.08;
  background-image: linear-gradient(#aaa 1px, transparent 1px), linear-gradient(90deg, #aaa 1px, transparent 1px);
  background-size: var(--map-grid-size) !important;
}
.node {
  position: absolute !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  min-width: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  transform: translate(-50%, -50%) !important;
  left: var(--map-node-left) !important;
  top: var(--map-node-top) !important;
  z-index: var(--map-node-z) !important;
  cursor: pointer;
}
.icon {
  display: block !important;
  flex: 0 0 auto !important;
  color: #c5a059 !important;
}
.small {
  width: 24px !important;
  height: 24px !important;
}
.medium {
  width: 32px !important;
  height: 32px !important;
}
.large {
  width: 48px !important;
  height: 48px !important;
}
.node span {
  margin-top: 5px;
  padding: 2px 6px;
  background: #000a;
  color: #aaa;
  border-radius: 4px;
}
.here span {
  color: #c5a059;
  border: 1px solid;
}
.node i {
  color: #c5a059;
  font-size: 10px;
}
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  padding: 20px;
}
.overlay > * {
  pointer-events: auto;
}
.overlay nav {
  display: flex;
  padding: 10px 18px;
  background: linear-gradient(90deg, #14161cf2, transparent);
  border-left: 3px solid #c5a059;
}
.overlay nav button {
  color: #c5a059;
  background: none;
  border: 0;
}
.overlay nav button + button:before {
  content: '/';
  margin-right: 10px;
  color: #555;
}
.search {
  position: absolute;
  top: 20px;
  right: 20px;
  display: grid;
  justify-items: end;
}
.search > div {
  display: grid;
  width: 240px;
  padding: 8px;
  background: #14161cf5;
}
.search > div button {
  display: grid;
  text-align: left;
}
.search small {
  color: #777;
}
.back {
  position: absolute;
  bottom: 30px;
  left: 30px;
  color: #c5a059;
  background: #000c;
  border: 1px solid;
  padding: 10px 18px;
}
.detail {
  position: absolute;
  top: 20%;
  right: 30px;
  width: 300px;
  padding: 16px;
  background: #14161cf5;
  border: 1px solid #444;
  border-top: 3px solid #c5a059;
  box-shadow: 0 10px 30px #000;
}
.detail h3 {
  color: #c5a059;
}
.detail small {
  color: #666;
}
.detail footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detail footer button {
  flex: 1;
  padding: 8px;
}
.detail .primary {
  background: #c5a059;
  color: #111;
}
.detail .danger {
  color: #b85c67;
  border-color: #b85c67;
}
.close {
  position: absolute;
  right: 8px;
  top: 8px;
}
@media (max-width: 700px) {
  .detail {
    top: auto;
    right: 0;
    bottom: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .overlay {
    padding: 10px;
  }
  .back {
    bottom: 90px;
    left: 10px;
  }
}
</style>
