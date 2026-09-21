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
        <div class="cartography" :style="cartographyStyle" aria-hidden="true"></div>
        <div
          v-for="node in nodes"
          :key="node.name"
          class="node"
          :class="[`size-${sizeClass}`, { here: node.name === currentLocation, focused: focus?.name === node.name }]"
          :style="nodeStyle(node)"
          @click.stop="selectNode(node)"
        >
          <div class="map-node-icon" :class="`shape-${iconShape}`">
            <MapSvgIcon :svg="node.icon" />
          </div>
          <span class="node-label">{{ node.name }}</span
          ><i v-if="node.name === currentLocation">YOU</i>
          <aside
            v-if="focus?.name === node.name"
            class="detail"
            :class="{ left: detailIsLeft(node) }"
            @click.stop
            @mousedown.stop
            @wheel.stop
            @touchstart.stop
            @touchmove.stop
          >
            <button class="close" aria-label="关闭地点详情" @click.stop="focus = undefined">×</button>
            <h3>{{ focus.name }}</h3>
            <div class="detail-tabs" role="tablist" aria-label="地点信息">
              <button
                :class="{ active: detailTab === 'summary' }"
                role="tab"
                :aria-selected="detailTab === 'summary'"
                @click="detailTab = 'summary'"
              >
                简介
              </button>
              <button
                :class="{ active: detailTab === 'details' }"
                role="tab"
                :aria-selected="detailTab === 'details'"
                @click="detailTab = 'details'"
              >
                详细
              </button>
            </div>
            <div class="detail-content">
              <p v-if="detailTab === 'summary'">{{ focus.desc || '暂无简介' }}</p>
              <ul v-else-if="focus.details.length">
                <li v-for="item in focus.details" :key="item">{{ item }}</li>
              </ul>
              <p v-else>暂无详细信息</p>
            </div>
            <small>E:{{ focus.displayX.toFixed(1) }} km N:{{ focus.displayY.toFixed(1) }} km</small>
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
      </div>
    </div>
    <div class="overlay">
      <nav>
        <button @click="navigateRoot">全部地图</button>
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
    <button v-if="trail.length" class="back" @click="goUp">← LEAVE {{ trail.at(-1)?.name }}</button>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { mapSvgDisplaySize } from '../../../../创意工坊/scenario/map';
import { layoutMapNodes, mapLayoutBounds, type MapLayoutItem } from './layout';
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
  iconWidth?: number;
  iconHeight?: number;
  iconAspectRatio?: number;
  hasChildren: boolean;
  originalData: Record<string, any>;
};
const props = withDefaults(
  defineProps<{
    map: Record<string, any>;
    mode?: Mode;
    currentLocation?: string;
    iconSize?: number;
    iconShape?: 'none' | 'circle' | 'rounded' | 'square';
  }>(),
  {
    mode: 'preview',
    currentLocation: '',
    iconSize: undefined,
    iconShape: 'none',
  },
);
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
  detailTab = ref<'summary' | 'details'>('summary'),
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
  if (!Object.keys(props.map ?? {}).length) {
    trail.value = [];
    root.value = undefined;
    return;
  }
  const path = props.currentLocation ? findPath(props.map, props.currentLocation) : undefined;
  trail.value = path?.slice(0, -1) ?? [];
  root.value = trail.value.at(-1)?.node;
  focus.value = undefined;
  nextTick(fit);
}
const visibleNodes = computed(() => (root.value ? (root.value.子地图 ?? {}) : (props.map ?? {})));
const nodes = computed<NodeView[]>(() =>
  Object.entries(visibleNodes.value).map(([name, value]) => {
    const v = value as any,
      x = v.方位?.x ?? [0, 0],
      y = v.方位?.y ?? [0, 0],
      z = v.方位?.z ?? [0, 0],
      icon = typeof v.图标 === 'string' ? v.图标 : '',
      iconDimensions = mapSvgDisplaySize(icon);
    return {
      name,
      displayX: (x[0] + x[1]) / 2,
      displayY: (y[0] + y[1]) / 2,
      z: (z[0] + z[1]) / 2,
      desc: v.描述 ?? '',
      details: Array.isArray(v.详情) ? v.详情 : [],
      icon,
      iconWidth: iconDimensions.width,
      iconHeight: iconDimensions.height,
      iconAspectRatio: iconDimensions.aspectRatio,
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
  gridStyle = computed(() => ({
    '--map-grid-size': `${100 * transform.k}px ${100 * transform.k}px`,
    '--map-grid-sub-size': `${20 * transform.k}px ${20 * transform.k}px`,
  })),
  cartographyStyle = computed(() => ({ '--map-chart-size': `${Math.max(360, 760 * transform.k)}px` })),
  sizeClass = computed(() => (baseScale.value > 40 ? 'large' : baseScale.value < 2 ? 'small' : 'medium'));
const defaultIconSize = computed(() =>
  Math.max(
    16,
    Math.min(props.iconSize ?? (sizeClass.value === 'large' ? 56 : sizeClass.value === 'small' ? 30 : 40), 160),
  ),
);
const layoutNodes = computed(() => {
  const byName = new Map<string, MapLayoutItem>();
  for (const item of layoutMapNodes(
    nodes.value.map(node => ({
      key: node.name,
      x: node.displayX,
      y: -node.displayY,
      z: node.z,
      width:
        node.iconWidth ??
        (node.iconHeight && node.iconAspectRatio ? node.iconHeight * node.iconAspectRatio : defaultIconSize.value),
      height:
        node.iconHeight ??
        (node.iconWidth && node.iconAspectRatio ? node.iconWidth / node.iconAspectRatio : defaultIconSize.value),
    })),
    { coordinateScale: baseScale.value * transform.k, iconScale: transform.k },
  ))
    byName.set(item.key, item);
  return byName;
});
const nodeStyle = (n: NodeView) => {
  const layout = layoutNodes.value.get(n.name);
  const style: Record<string, string | number> = {
    '--map-node-left': `calc(50% + ${layout?.visualX ?? 0}px)`,
    '--map-node-top': `calc(50% + ${layout?.visualY ?? 0}px)`,
    '--map-node-z': Math.floor(n.z * 100) + 10,
    '--map-svg-width': `${layout?.renderWidth ?? defaultIconSize.value}px`,
    '--map-svg-height': `${layout?.renderHeight ?? defaultIconSize.value}px`,
  };
  return style;
};
function selectNode(node: NodeView) {
  focus.value = node;
  detailTab.value = 'summary';
}
function detailIsLeft(node: NodeView) {
  const visualX = layoutNodes.value.get(node.name)?.visualX ?? 0;
  return visualX + transform.x > 0;
}
function fit() {
  if (!viewport.value || !nodes.value.length) return;
  const rect = viewport.value.getBoundingClientRect(),
    availableWidth = rect.width * 0.75,
    availableHeight = rect.height * 0.75,
    input = nodes.value.map(node => ({
      key: node.name,
      x: node.displayX,
      y: -node.displayY,
      z: node.z,
      width:
        node.iconWidth ??
        (node.iconHeight && node.iconAspectRatio ? node.iconHeight * node.iconAspectRatio : defaultIconSize.value),
      height:
        node.iconHeight ??
        (node.iconWidth && node.iconAspectRatio ? node.iconWidth / node.iconAspectRatio : defaultIconSize.value),
    }));
  let low = 0.05,
    high = 150;
  for (let iteration = 0; iteration < 24; iteration++) {
    const candidate = (low + high) / 2,
      bounds = mapLayoutBounds(layoutMapNodes(input, { coordinateScale: candidate, iconScale: 1 }));
    if (bounds.width <= availableWidth && bounds.height <= availableHeight) low = candidate;
    else high = candidate;
  }
  baseScale.value = low;
  transform.k = 1;
  const bounds = mapLayoutBounds(layoutMapNodes(input, { coordinateScale: baseScale.value, iconScale: 1 }));
  transform.x = -(bounds.left + bounds.right) / 2;
  transform.y = -(bounds.top + bounds.bottom) / 2;
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
  root.value = trail.value.at(-1)?.node;
  focus.value = undefined;
  nextTick(fit);
}
function navigateRoot() {
  navigate(-1);
}
function goUp() {
  navigate(trail.value.length - 2);
}
function jump(item: { crumbs: Crumb[] }) {
  const parent = item.crumbs.slice(0, -1);
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
  isolation: isolate;
  background:
    radial-gradient(ellipse at 50% 44%, rgba(181, 137, 67, 0.105) 0, rgba(93, 73, 44, 0.045) 28%, transparent 63%),
    radial-gradient(ellipse at 7% 12%, rgba(67, 91, 116, 0.13), transparent 42%),
    radial-gradient(ellipse at 94% 88%, rgba(42, 60, 80, 0.11), transparent 46%),
    linear-gradient(145deg, #171d26 0%, #0e131b 48%, #090d13 100%);
  color: #ddd;
  user-select: none;
}
.vision::before,
.vision::after {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  content: '';
}
.vision::before {
  opacity: 0.2;
  mix-blend-mode: soft-light;
  background:
    radial-gradient(ellipse at 42% 38%, rgba(255, 224, 162, 0.15), transparent 34%),
    radial-gradient(ellipse at 64% 58%, rgba(111, 131, 151, 0.08), transparent 38%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.42' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.34'/%3E%3C/svg%3E");
}
.vision::after {
  box-shadow: inset 0 0 110px 18px rgba(1, 3, 7, 0.62);
  background: radial-gradient(ellipse at center, transparent 48%, rgba(3, 6, 10, 0.16) 74%, rgba(2, 4, 8, 0.48) 100%);
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
  pointer-events: none;
  opacity: 0.42;
  background-image:
    linear-gradient(rgba(197, 160, 89, 0.075) 1px, transparent 1px),
    linear-gradient(90deg, rgba(197, 160, 89, 0.075) 1px, transparent 1px),
    linear-gradient(rgba(172, 185, 194, 0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(172, 185, 194, 0.022) 1px, transparent 1px);
  background-size:
    var(--map-grid-size), var(--map-grid-size), var(--map-grid-sub-size), var(--map-grid-sub-size) !important;
}
.cartography {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--map-chart-size);
  height: var(--map-chart-size);
  box-sizing: border-box;
  border: 1px solid rgba(197, 160, 89, 0.08);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-8deg);
  opacity: 0.22;
  pointer-events: none;
  background:
    linear-gradient(transparent calc(50% - 0.5px), rgba(197, 160, 89, 0.07) 50%, transparent calc(50% + 0.5px)),
    linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(197, 160, 89, 0.07) 50%, transparent calc(50% + 0.5px)),
    repeating-conic-gradient(from 2deg, rgba(197, 160, 89, 0.12) 0 0.3deg, transparent 0.3deg 15deg);
  -webkit-mask: radial-gradient(
    circle,
    transparent 0 48%,
    #000 48.2% 50%,
    transparent 50.2% 67%,
    #000 67.2% 68%,
    transparent 68.2%
  );
  mask: radial-gradient(
    circle,
    transparent 0 48%,
    #000 48.2% 50%,
    transparent 50.2% 67%,
    #000 67.2% 68%,
    transparent 68.2%
  );
}
.cartography::before,
.cartography::after {
  position: absolute;
  border: 1px dashed rgba(197, 160, 89, 0.12);
  border-radius: 50%;
  content: '';
}
.cartography::before {
  inset: 18%;
}
.cartography::after {
  inset: 36%;
  border-style: solid;
  border-color: rgba(197, 160, 89, 0.09);
}
.node {
  position: absolute !important;
  display: block !important;
  width: var(--map-svg-width, var(--map-icon-size)) !important;
  height: var(--map-svg-height, var(--map-icon-size)) !important;
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
.node.focused {
  z-index: 10000 !important;
}
.map-node-icon {
  display: grid !important;
  place-items: center !important;
  flex: 0 0 auto !important;
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: #c5a059 !important;
}
.node.size-small {
  --map-icon-size: 30px;
}
.node.size-medium {
  --map-icon-size: 40px;
}
.node.size-large {
  --map-icon-size: 56px;
}
.map-node-icon.shape-circle,
.map-node-icon.shape-rounded,
.map-node-icon.shape-square {
  padding: 15% !important;
  background: #14161ccc !important;
  border: 1px solid currentColor !important;
}
.map-node-icon.shape-circle {
  border-radius: 50% !important;
}
.map-node-icon.shape-rounded {
  border-radius: 22% !important;
}
.node > .node-label {
  position: absolute !important;
  top: calc(100% + 5px) !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  margin: 0 !important;
  padding: 2px 6px;
  white-space: nowrap;
  background: #000a;
  color: #aaa;
  border-radius: 4px;
}
.here > .node-label {
  color: #c5a059;
  border: 1px solid;
}
.node i {
  position: absolute !important;
  top: calc(100% + 30px) !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  color: #c5a059;
  font-size: 10px;
}
.overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
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
  position: absolute !important;
  top: 20px !important;
  right: 20px !important;
  display: grid !important;
  justify-items: end !important;
}
.search > button {
  padding: 8px 12px !important;
  color: #c5a059 !important;
  background: #14161cf5 !important;
  border: 1px solid #594d31 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font: inherit !important;
  cursor: pointer !important;
}
.search > div {
  display: grid !important;
  width: 240px !important;
  padding: 8px !important;
  background: #14161cf5 !important;
}
.search > div button {
  display: grid !important;
  color: #ddd !important;
  background: transparent !important;
  border: 0 !important;
  text-align: left !important;
}
.search small {
  color: #999 !important;
}
.back {
  position: absolute;
  z-index: 5;
  bottom: 30px;
  left: 30px;
  color: #c5a059;
  background: #000c;
  border: 1px solid;
  padding: 10px 18px;
}
.detail {
  position: absolute !important;
  z-index: 2;
  top: 50% !important;
  left: calc(100% + 18px) !important;
  width: 290px !important;
  max-height: 420px;
  box-sizing: border-box !important;
  padding: 16px !important;
  transform: translateY(-50%) !important;
  cursor: default;
  color: #ddd !important;
  background: #14161cf5 !important;
  border: 1px solid #444 !important;
  border-top: 3px solid #c5a059 !important;
  box-shadow: 0 10px 30px #000 !important;
}
.detail.left {
  right: calc(100% + 18px) !important;
  left: auto !important;
}
.detail p,
.detail li {
  color: #ddd !important;
}
.detail h3 {
  margin: 0 32px 12px 0;
  color: #c5a059 !important;
}
.detail small {
  color: #888 !important;
}
.detail-tabs {
  display: flex;
  gap: 0;
  margin: 0 0 12px;
  border-bottom: 1px solid #3f3a30;
}
.detail-tabs button {
  padding: 6px 14px !important;
  color: #8d8d8d !important;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  font: inherit !important;
  cursor: pointer !important;
}
.detail-tabs button.active {
  color: #c5a059 !important;
  border-bottom-color: #c5a059 !important;
}
.detail-content {
  max-height: 190px;
  margin-bottom: 10px;
  overflow-y: auto;
  user-select: text;
}
.detail-content p {
  margin: 0;
  line-height: 1.65;
}
.detail-content ul {
  margin: 0;
  padding-left: 20px;
}
.detail-content li + li {
  margin-top: 6px;
}
.detail footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.detail footer button {
  flex: 1 !important;
  padding: 8px !important;
  color: #ddd !important;
  background: #1d2128 !important;
  border: 1px solid #555 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font: inherit !important;
}
.detail .primary {
  color: #111 !important;
  background: #c5a059 !important;
  border-color: #c5a059 !important;
}
.detail .danger {
  color: #d77a85 !important;
  background: #1d2128 !important;
  border-color: #b85c67 !important;
}
.close {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  min-width: 30px !important;
  padding: 3px 7px !important;
  color: #ddd !important;
  background: transparent !important;
  border: 1px solid #555 !important;
  border-radius: 0 !important;
}
@media (max-width: 700px) {
  .detail {
    top: calc(100% + 18px) !important;
    right: auto !important;
    left: 50% !important;
    width: min(290px, calc(100vw - 24px)) !important;
    max-height: 360px;
    transform: translateX(-50%) !important;
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
