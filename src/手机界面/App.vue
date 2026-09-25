<template>
  <div class="phone-module">
    <button
      v-if="!open"
      ref="launcherButton"
      class="phone-launcher"
      type="button"
      :style="launcherStyle"
      aria-label="打开手机界面，拖拽可移动"
      @pointerdown="startDrag($event, 'launcher')"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @click="openPhone"
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="17" y="5" width="30" height="54" rx="8" fill="#131b32" stroke="#dfe8ff" stroke-width="2.5" />
        <rect x="20" y="9" width="24" height="46" rx="5" fill="url(#phoneLauncherGradient)" />
        <path d="M27 10h10" stroke="#17213d" stroke-width="3" stroke-linecap="round" />
        <circle cx="32" cy="50" r="2" fill="#e8efff" />
        <defs>
          <linearGradient id="phoneLauncherGradient" x1="20" y1="9" x2="45" y2="55">
            <stop stop-color="#94c8ff" />
            <stop offset=".52" stop-color="#776ad6" />
            <stop offset="1" stop-color="#ed91ba" />
          </linearGradient>
        </defs>
      </svg>
    </button>

    <div v-else class="phone-overlay">
      <div ref="phoneFrame" class="phone-frame" :style="phoneStyle">
        <div class="phone-screen" :style="{ '--screen-brightness': `${brightness}%` }">
          <div class="wallpaper"></div>
          <header class="status-bar" :class="{ 'status-bar-light': activeApp }" aria-label="状态栏">
            <span
              class="window-drag-handle"
              title="拖拽移动手机窗口"
              @pointerdown="startDrag($event, 'phone')"
              @pointermove="moveDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
              >{{ time }}</span
            >
            <span class="dynamic-island" aria-hidden="true"></span>
            <button
              class="control-trigger"
              type="button"
              aria-label="打开控制中心"
              @click="controlCenterOpen = true"
              @pointerdown="startControlSwipe"
              @pointerup="endControlSwipe"
            >
              ●●● ᯤ ▰ <span>⌄</span>
            </button>
          </header>

          <main v-if="!activeApp" class="home-screen">
            <div class="home-heading">
              <span>今天</span>
              <strong>{{ dateLabel }}</strong>
            </div>
            <div class="app-grid">
              <button v-for="app in apps" :key="app.name" class="app-tile" type="button" @click="activeApp = app.name">
                <span
                  class="app-icon"
                  :class="{ 'wechat-icon': app.name === '微信' }"
                  :style="{ background: app.color }"
                  aria-hidden="true"
                  >{{ app.name === '日历' ? now.getDate() : app.name === '微信' ? '' : app.icon }}</span
                >
                <span>{{ app.name }}</span>
              </button>
            </div>
            <div class="home-spacer"></div>
            <div class="page-dots" aria-hidden="true"><span></span><span></span></div>
            <div class="dock">
              <button
                v-for="app in dockApps"
                :key="app.name"
                class="dock-tile"
                type="button"
                :aria-label="app.name"
                @click="activeApp = app.name"
              >
                <span class="app-icon" :style="{ background: app.color }" aria-hidden="true">{{ app.icon }}</span>
              </button>
            </div>
          </main>

          <main v-else-if="activeApp === '微信'" class="wechat-screen">
            <WeChat />
          </main>

          <main v-else class="app-screen">
            <button class="back-button" type="button" @click="activeApp = null">‹ 桌面</button>
            <div class="app-placeholder">
              <span class="placeholder-icon" :style="{ background: selectedApp?.color }">{{
                activeApp === '日历' ? now.getDate() : selectedApp?.icon
              }}</span>
              <h1>{{ activeApp }}</h1>
              <p>应用内容待接入</p>
            </div>
          </main>

          <div
            v-if="controlCenterOpen"
            class="control-center"
            @pointerdown="startCenterSwipe"
            @pointerup="endCenterSwipe"
          >
            <button class="control-grabber" type="button" aria-label="关闭控制中心" @click="controlCenterOpen = false">
              <span></span>
            </button>
            <div class="control-time">
              {{ time }}<small>{{ dateLabel }}</small>
            </div>
            <div class="control-grid">
              <div class="connectivity-card">
                <button
                  v-for="toggle in connectivity"
                  :key="toggle.key"
                  class="round-control"
                  :class="{ enabled: controls[toggle.key] }"
                  type="button"
                  :aria-pressed="controls[toggle.key]"
                  @click="controls[toggle.key] = !controls[toggle.key]"
                >
                  <span>{{ toggle.icon }}</span
                  ><small>{{ toggle.label }}</small>
                </button>
              </div>
              <button
                class="control-card"
                type="button"
                :aria-pressed="controls.focus"
                @click="controls.focus = !controls.focus"
              >
                <span>☾</span><small>专注模式 {{ controls.focus ? '开' : '关' }}</small>
              </button>
              <label class="slider-card"
                ><span>☀</span
                ><input v-model.number="brightness" type="range" min="20" max="100" aria-label="亮度" /><small
                  >亮度 {{ brightness }}%</small
                ></label
              >
              <label class="slider-card"
                ><span>♫</span><input v-model.number="volume" type="range" min="0" max="100" aria-label="音量" /><small
                  >音量 {{ volume }}%</small
                ></label
              >
              <button
                class="control-card"
                type="button"
                :aria-pressed="controls.rotation"
                @click="controls.rotation = !controls.rotation"
              >
                <span>⟳</span><small>旋转锁定 {{ controls.rotation ? '开' : '关' }}</small>
              </button>
              <button
                class="control-card"
                type="button"
                :aria-pressed="controls.flashlight"
                @click="controls.flashlight = !controls.flashlight"
              >
                <span>✦</span><small>手电筒 {{ controls.flashlight ? '开' : '关' }}</small>
              </button>
            </div>
            <button class="power-off" type="button" @click="closePhone">退出手机界面</button>
          </div>

          <button class="home-indicator" type="button" aria-label="返回桌面" @click="activeApp = null"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import WeChat from './WeChat.vue';

const apps = [
  { name: '微信', icon: '', color: 'linear-gradient(145deg, #42d76c, #08aa41)' },
  { name: '信息', icon: '●', color: 'linear-gradient(145deg, #73e878, #19ae45)' },
  { name: '照片', icon: '✿', color: 'linear-gradient(145deg, #fff, #e6e8ed)' },
  { name: '相机', icon: '◎', color: 'linear-gradient(145deg, #8e929a, #525761)' },
  { name: '日历', icon: '25', color: 'linear-gradient(145deg, #fff, #eef0f2)' },
  { name: '地图', icon: '⌖', color: 'linear-gradient(145deg, #6ad5b7, #4b8ef4)' },
  { name: '天气', icon: '☀', color: 'linear-gradient(145deg, #68c6ff, #2277e8)' },
  { name: '备忘录', icon: '≡', color: 'linear-gradient(180deg, #ffd95e 22%, #fff 22%)' },
  { name: '设置', icon: '⚙', color: 'linear-gradient(145deg, #a9aeb8, #626976)' },
];
const dockApps = [
  { name: '电话', icon: '☎', color: 'linear-gradient(145deg, #72e978, #21ad4a)' },
  { name: '浏览器', icon: '◉', color: 'linear-gradient(145deg, #9cdeff, #2584ed)' },
  { name: '音乐', icon: '♫', color: 'linear-gradient(145deg, #ff898a, #ee3157)' },
  { name: '文件', icon: '▣', color: 'linear-gradient(145deg, #91c8ff, #3788f5)' },
];
const open = ref(false);
const activeApp = ref<string | null>(null);
const controlCenterOpen = ref(false);
const brightness = ref(100);
const volume = ref(50);
const controls = reactive({
  wifi: true,
  bluetooth: true,
  airplane: false,
  cellular: true,
  focus: false,
  rotation: false,
  flashlight: false,
});
const connectivity = [
  { key: 'airplane', icon: '✈', label: '飞行模式' },
  { key: 'cellular', icon: '▂', label: '蜂窝网络' },
  { key: 'wifi', icon: 'ᯤ', label: '无线网络' },
  { key: 'bluetooth', icon: 'ᛒ', label: '蓝牙' },
] as const;
const launcherPosition = reactive({ left: 20, top: 120 });
const phonePosition = reactive({ left: 0, top: 0 });
const launcherStyle = computed(() => ({ left: `${launcherPosition.left}px`, top: `${launcherPosition.top}px` }));
const phoneStyle = computed(() => ({ left: `${phonePosition.left}px`, top: `${phonePosition.top}px` }));
const phoneFrame = ref<HTMLElement>();
const launcherButton = ref<HTMLElement>();
const now = ref(new Date());
const time = computed(() =>
  now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
);
const dateLabel = computed(() =>
  now.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }),
);
const selectedApp = computed(() => [...apps, ...dockApps].find(app => app.name === activeApp.value));
let clock: ReturnType<typeof setInterval> | undefined;
let hostWindow: Window | null = null;
let drag: { kind: 'launcher' | 'phone'; x: number; y: number; left: number; top: number; pointerId: number } | null =
  null;
let didDrag = false;
let controlSwipeStart = 0;
let centerSwipeStart = 0;

function clampPosition(left: number, top: number, width: number, height: number) {
  return {
    left: Math.max(0, Math.min(left, Math.max(0, (hostWindow?.innerWidth ?? width) - width))),
    top: Math.max(0, Math.min(top, Math.max(0, (hostWindow?.innerHeight ?? height) - height))),
  };
}
function startDrag(event: PointerEvent, kind: 'launcher' | 'phone') {
  if (kind === 'phone' && (hostWindow?.innerWidth ?? 0) <= 600) return;
  const target = event.currentTarget as HTMLElement;
  hostWindow = target.ownerDocument.defaultView;
  const position = kind === 'launcher' ? launcherPosition : phonePosition;
  drag = {
    kind,
    x: event.clientX,
    y: event.clientY,
    left: position.left,
    top: position.top,
    pointerId: event.pointerId,
  };
  didDrag = false;
  target.setPointerCapture(event.pointerId);
}
function moveDrag(event: PointerEvent) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!didDrag && Math.hypot(dx, dy) < 4) return;
  didDrag = true;
  const position = drag.kind === 'launcher' ? launcherPosition : phonePosition;
  const width = drag.kind === 'launcher' ? 52 : (phoneFrame.value?.offsetWidth ?? 390);
  const height = drag.kind === 'launcher' ? 52 : (phoneFrame.value?.offsetHeight ?? 844);
  Object.assign(position, clampPosition(drag.left + dx, drag.top + dy, width, height));
}
function endDrag(event: PointerEvent) {
  if (drag?.pointerId !== event.pointerId) return;
  drag = null;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
}
function openPhone() {
  if (didDrag) {
    didDrag = false;
    return;
  }
  const width = Math.min(390, (hostWindow?.innerWidth ?? 390) - 32);
  const height = Math.min(844, (hostWindow?.innerHeight ?? 844) - 32);
  phonePosition.left = Math.max(0, ((hostWindow?.innerWidth ?? width) - width) / 2);
  phonePosition.top = Math.max(0, ((hostWindow?.innerHeight ?? height) - height) / 2);
  open.value = true;
}
function closePhone() {
  controlCenterOpen.value = false;
  open.value = false;
  didDrag = false;
}
function startControlSwipe(event: PointerEvent) {
  controlSwipeStart = event.clientY;
}
function endControlSwipe(event: PointerEvent) {
  if (event.clientY - controlSwipeStart > 25) controlCenterOpen.value = true;
}
function startCenterSwipe(event: PointerEvent) {
  centerSwipeStart = event.clientY;
}
function endCenterSwipe(event: PointerEvent) {
  if (event.clientY - centerSwipeStart < -40) controlCenterOpen.value = false;
}
function onResize() {
  Object.assign(launcherPosition, clampPosition(launcherPosition.left, launcherPosition.top, 52, 52));
  if (phoneFrame.value)
    Object.assign(
      phonePosition,
      clampPosition(phonePosition.left, phonePosition.top, phoneFrame.value.offsetWidth, phoneFrame.value.offsetHeight),
    );
}
onMounted(() => {
  hostWindow = launcherButton.value?.ownerDocument.defaultView ?? null;
  hostWindow?.addEventListener('resize', onResize);
  clock = setInterval(() => {
    now.value = new Date();
  }, 60_000);
});
onUnmounted(() => {
  hostWindow?.removeEventListener('resize', onResize);
  if (clock) clearInterval(clock);
});
</script>

<style>
.phone-module,
.phone-module * {
  box-sizing: border-box;
}
.phone-module {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}
.phone-module button {
  font: inherit;
  cursor: pointer;
}
.phone-launcher {
  position: fixed;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  background: none;
  touch-action: none;
  pointer-events: auto;
  filter: drop-shadow(0 5px 8px #0008);
}
.phone-launcher svg {
  display: block;
  width: 100%;
  height: 100%;
}
.phone-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
}
.phone-frame {
  position: absolute;
  width: min(390px, calc(100vw - 32px));
  height: min(844px, calc(100dvh - 32px));
  padding: 7px;
  border-radius: 48px;
  background: #111318;
  box-shadow:
    0 25px 75px #0008,
    inset 0 0 0 2px #70737a;
  pointer-events: auto;
}
.phone-screen {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 41px;
  color: #fff;
  background: #182342;
}
.wallpaper {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 78% 20%, #aeb4eb 0, transparent 35%),
    radial-gradient(ellipse at 15% 66%, #7659ae 0, transparent 40%),
    linear-gradient(160deg, #23486a, #283863 45%, #141b44);
}
.wallpaper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #07132720, transparent 42%, #07132755);
}
.status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 25px;
  font-size: 14px;
  font-weight: 650;
}
.status-bar-light {
  color: #151820;
}
.window-drag-handle {
  display: flex;
  align-items: center;
  min-width: 80px;
  height: 100%;
  cursor: grab;
  touch-action: none;
}
.window-drag-handle:active {
  cursor: grabbing;
}
.dynamic-island {
  position: absolute;
  left: 50%;
  top: 10px;
  width: 103px;
  height: 29px;
  transform: translateX(-50%);
  border-radius: 18px;
  background: #08090d;
}
.control-trigger {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0 8px 8px;
  border: 0;
  background: none;
  color: inherit;
  font-size: 12px;
  letter-spacing: -2px;
}
.control-trigger span {
  margin-left: 4px;
  font-size: 17px;
  letter-spacing: 0;
}
.wallpaper {
  filter: brightness(var(--screen-brightness));
}
.home-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 88px 20px 32px;
}
.home-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 4px 31px;
  text-shadow: 0 2px 10px #0004;
}
.home-heading span {
  font-size: 16px;
  font-weight: 600;
}
.home-heading strong {
  font-size: 28px;
  font-weight: 650;
}
.app-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px 8px;
}
.app-tile,
.dock-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 0;
  background: none;
  color: #fff;
  font-size: 12px !important;
  text-shadow: 0 1px 5px #0006;
}
.app-icon,
.placeholder-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 15px;
  color: #fff;
  box-shadow: 0 3px 12px #0003;
  font-size: 32px;
  font-weight: 500;
  text-shadow: none;
}
.wechat-icon::before,
.wechat-icon::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: #fff;
}
.wechat-icon {
  position: relative;
}
.wechat-icon::before {
  width: 31px;
  height: 24px;
  transform: translate(-6px, -4px);
}
.wechat-icon::after {
  width: 25px;
  height: 20px;
  transform: translate(8px, 9px);
  box-shadow: -3px -3px 0 #15b64c;
}
.app-tile:nth-child(2) .app-icon {
  color: #ee627a;
}
.app-tile:nth-child(4) .app-icon {
  color: #d4494b;
  font-size: 26px;
  font-weight: 650;
}
.app-tile:nth-child(7) .app-icon {
  color: #454b57;
}
.home-spacer {
  flex: 1;
}
.page-dots {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-bottom: 14px;
}
.page-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff70;
}
.page-dots span:first-child {
  background: #fff;
}
.dock {
  display: flex;
  justify-content: space-around;
  align-items: center;
  min-height: 81px;
  border: 1px solid #ffffff32;
  border-radius: 26px;
  background: #ffffff3b;
  backdrop-filter: blur(20px);
}
.app-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 67px 22px 30px;
  background: #f5f5f8;
  color: #151820;
}
.wechat-screen {
  position: relative;
  height: 100%;
  background: #ededed;
}
.back-button {
  align-self: flex-start;
  border: 0;
  background: none;
  color: #3478ee;
  font-size: 16px !important;
}
.app-placeholder {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 55px;
}
.placeholder-icon {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  font-size: 42px;
}
.app-placeholder h1 {
  margin: 20px 0 7px;
  font-size: 25px;
}
.app-placeholder p {
  margin: 0;
  color: #8a8f9c;
  font-size: 14px;
}
.control-center {
  position: absolute;
  z-index: 6;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 48px 18px 36px;
  background: linear-gradient(145deg, #34405ddd, #252d43f2 65%, #1c2539f5);
  backdrop-filter: blur(24px);
  color: #fff;
}
.control-grabber {
  align-self: center;
  width: 90px;
  height: 20px;
  padding: 6px;
  border: 0;
  background: none;
}
.control-grabber span {
  display: block;
  height: 5px;
  border-radius: 5px;
  background: #ffffff8a;
}
.control-time {
  display: flex;
  flex-direction: column;
  margin: 15px 5px 24px;
  font-size: 48px;
  font-weight: 600;
  line-height: 1;
}
.control-time small {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 500;
}
.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.connectivity-card,
.control-card,
.slider-card {
  min-height: 112px;
  border: 1px solid #ffffff20;
  border-radius: 22px;
  background: #ffffff24;
  color: #fff;
  backdrop-filter: blur(12px);
}
.connectivity-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  padding: 9px;
}
.round-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 0;
  border-radius: 14px;
  background: #ffffff18;
  color: #fff;
}
.round-control.enabled,
.control-card[aria-pressed='true'] {
  background: #477ee9;
}
.round-control span {
  font-size: 24px;
  line-height: 1;
}
.round-control small {
  font-size: 10px;
}
.control-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  text-align: left;
}
.control-card span {
  font-size: 30px;
  line-height: 1;
}
.control-card small,
.slider-card small {
  font-size: 12px;
}
.slider-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 9px;
  padding: 14px;
}
.slider-card span {
  font-size: 26px;
  line-height: 1;
}
.slider-card input {
  width: 100%;
  accent-color: #fff;
}
.power-off {
  margin-top: auto;
  flex-shrink: 0;
  min-height: 45px;
  border: 1px solid #ffffff3d;
  border-radius: 15px;
  background: #ffffff20;
  color: #fff;
}
.home-indicator {
  position: absolute;
  z-index: 4;
  bottom: 9px;
  left: 50%;
  width: 125px;
  height: 5px;
  transform: translateX(-50%);
  border: 0;
  border-radius: 9px;
  background: #fff;
  padding: 0;
}
.app-screen ~ .home-indicator,
.wechat-screen ~ .home-indicator {
  background: #16191f;
}
@media (max-width: 600px) {
  .phone-frame {
    width: 100vw;
    height: 100dvh;
    left: 0 !important;
    top: 0 !important;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .phone-screen {
    border-radius: 0;
  }
  .status-bar {
    padding-top: env(safe-area-inset-top);
    height: calc(52px + env(safe-area-inset-top));
  }
  .dynamic-island {
    top: calc(10px + env(safe-area-inset-top));
  }
  .home-screen {
    padding-top: calc(88px + env(safe-area-inset-top));
    padding-bottom: max(32px, env(safe-area-inset-bottom));
  }
  .app-screen {
    padding-top: calc(67px + env(safe-area-inset-top));
  }
  .control-center {
    padding-top: calc(48px + env(safe-area-inset-top));
    padding-bottom: max(36px, env(safe-area-inset-bottom));
  }
  .home-indicator {
    bottom: max(9px, env(safe-area-inset-bottom));
  }
}
@media (max-height: 690px) {
  .home-heading {
    margin-bottom: 16px;
  }
  .app-grid {
    gap: 12px 8px;
  }
  .home-screen {
    padding-top: 66px;
  }
}
</style>
