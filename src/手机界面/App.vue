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
        <button
          class="window-drag-handle"
          type="button"
          aria-label="拖拽移动手机窗口"
          title="拖拽移动手机窗口"
          @pointerdown="startDrag($event, 'phone')"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" />
          </svg>
        </button>
        <div class="phone-screen" :style="{ '--screen-brightness': `${brightness}%` }">
          <div class="wallpaper"></div>
          <header class="status-bar" :class="{ 'status-bar-light': activeApp }" aria-label="状态栏">
            <span>{{ time }}</span>
            <button
              v-if="activeApp"
              class="status-home"
              type="button"
              aria-label="返回手机桌面"
              title="返回手机桌面"
              @click="activeApp = null"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
                <path d="M9 21v-7h6v7" />
              </svg>
            </button>
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

          <PhoneDesktop v-if="!activeApp" :date-label="dateLabel" :today="now.getDate()" @open="activeApp = $event" />

          <main v-else-if="activeApp === '微信'" class="wechat-screen">
            <WeChat />
          </main>

          <main v-else-if="isDataApp(activeApp)" class="data-app-screen">
            <DataApp :app="activeApp" @back="activeApp = null" />
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

          <ControlCenter
            v-if="controlCenterOpen"
            v-model:brightness="brightness"
            :time="time"
            :date-label="dateLabel"
            @close="controlCenterOpen = false"
            @power-off="closePhone"
          />

          <button
            v-if="!activeApp"
            class="home-indicator"
            type="button"
            aria-label="返回桌面"
            @click="activeApp = null"
          ></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useMagicGirlStatStore } from './store/StatStore';
import DataApp from './apps/data/DataApp.vue';
import WeChat from './apps/wechat/WeChat.vue';
import ControlCenter from './components/ControlCenter.vue';
import PhoneDesktop from './components/PhoneDesktop.vue';
import { apps, dockApps, isDataApp } from './desktopApps';

const open = ref(false);
const statStore = useMagicGirlStatStore();
const activeApp = ref<string | null>(null);
const controlCenterOpen = ref(false);
const brightness = ref(100);
const launcherPosition = reactive({ left: 20, top: 120 });
const phonePosition = reactive({ left: 0, top: 0 });
const launcherStyle = computed(() => ({ left: launcherPosition.left + 'px', top: launcherPosition.top + 'px' }));
const phoneStyle = computed(() => ({ left: phonePosition.left + 'px', top: phonePosition.top + 'px' }));
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

function clampPosition(left: number, top: number, width: number, height: number, topInset = 0) {
  return {
    left: Math.max(0, Math.min(left, Math.max(0, (hostWindow?.innerWidth ?? width) - width))),
    top: Math.max(topInset, Math.min(top, Math.max(topInset, (hostWindow?.innerHeight ?? height) - height))),
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
  Object.assign(position, clampPosition(drag.left + dx, drag.top + dy, width, height, drag.kind === 'phone' ? 40 : 0));
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
  const height = Math.min(844, (hostWindow?.innerHeight ?? 844) - 80);
  phonePosition.left = Math.max(0, ((hostWindow?.innerWidth ?? width) - width) / 2);
  phonePosition.top = Math.max(40, ((hostWindow?.innerHeight ?? height) - height) / 2);
  open.value = true;
  void statStore.checkWorldbook();
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
function onResize() {
  Object.assign(launcherPosition, clampPosition(launcherPosition.left, launcherPosition.top, 52, 52));
  if (phoneFrame.value)
    Object.assign(
      phonePosition,
      clampPosition(
        phonePosition.left,
        phonePosition.top,
        phoneFrame.value.offsetWidth,
        phoneFrame.value.offsetHeight,
        40,
      ),
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

<style src="./styles/phone.css"></style>
