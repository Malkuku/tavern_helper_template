<template>
  <div class="phone-module">
    <Transition name="phone-shell" mode="out-in">
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
        <span class="launcher-device" aria-hidden="true"><span class="launcher-display"></span></span>
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
            <span class="window-grip" aria-hidden="true"></span>
          </button>
          <div class="phone-screen" :style="{ '--screen-brightness': `${brightness}%` }">
            <div
              class="wallpaper"
              :style="
                wallpaper
                  ? { backgroundImage: `linear-gradient(180deg, #07132720, #07132755), url('${wallpaper}')` }
                  : {}
              "
            ></div>
            <header class="status-bar" :class="{ 'status-bar-light': activeApp }" aria-label="状态栏">
              <span>{{ time }}</span>
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

            <Transition name="phone-view" mode="out-in">
              <PhoneDesktop
                v-if="!activeApp"
                :key="'desktop'"
                :date-label="dateLabel"
                :today="worldDay"
                @open="activeApp = $event"
              />

              <main v-else-if="activeApp === '微信'" :key="'wechat'" class="wechat-screen">
                <WeChat />
              </main>

              <main v-else-if="isDataApp(activeApp)" :key="activeApp" class="data-app-screen">
                <DataApp :app="activeApp" />
              </main>

              <PhoneUtilities
                v-else-if="['备忘录', '电话', '日历', '天气'].includes(activeApp)"
                :key="activeApp"
                :app="activeApp"
              />

              <MapApp v-else-if="activeApp === '地图'" :key="activeApp" />

              <PhoneExtras
                v-else-if="['信息', '照片', '相机', '设置', '浏览器', '音乐', '文件'].includes(activeApp)"
                :key="activeApp"
                :app="activeApp"
                @wallpaper-changed="wallpaper = $event"
              />

              <main v-else :key="activeApp" class="app-screen">
                <div class="app-placeholder">
                  <span class="placeholder-icon" :style="{ background: selectedApp?.color }">{{
                    selectedApp?.icon
                  }}</span>
                  <h1>{{ activeApp }}</h1>
                  <p>应用内容待接入</p>
                </div>
              </main>
            </Transition>

            <Transition name="control-sheet">
              <ControlCenter
                v-if="controlCenterOpen"
                v-model:brightness="brightness"
                :time="time"
                :date-label="dateLabel"
                @close="controlCenterOpen = false"
                @power-off="closePhone"
              />
            </Transition>

            <button
              class="home-indicator"
              type="button"
              :aria-label="activeApp ? '返回桌面' : '退出手机'"
              :title="activeApp ? '返回桌面' : '退出手机'"
              @pointerdown="startHomeSwipe"
              @pointerup="finishHomeSwipe"
              @click="activateHome"
            ></button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useMagicGirlStatStore } from './store/StatStore';
import DataApp from './apps/data/DataApp.vue';
import WeChat from './apps/wechat/WeChat.vue';
import PhoneUtilities from './apps/PhoneUtilities.vue';
import PhoneExtras from './apps/PhoneExtras.vue';
import MapApp from './apps/map/MapApp.vue';
import ControlCenter from './components/ControlCenter.vue';
import PhoneDesktop from './components/PhoneDesktop.vue';
import { apps, dockApps, isDataApp } from './desktopApps';
import { readPhoneWallpaper } from './wallpaper';

const open = ref(false);
const statStore = useMagicGirlStatStore();
const activeApp = ref<string | null>(null);
const controlCenterOpen = ref(false);
const brightness = ref(100);
const wallpaper = ref('');
const launcherPosition = reactive({ left: 20, top: 120 });
const phonePosition = reactive({ left: 0, top: 0 });
const launcherStyle = computed(() => ({ left: launcherPosition.left + 'px', top: launcherPosition.top + 'px' }));
const phoneStyle = computed(() => ({ left: phonePosition.left + 'px', top: phonePosition.top + 'px' }));
const phoneFrame = ref<HTMLElement>();
const launcherButton = ref<HTMLElement>();
const worldTime = computed(() => statStore.statData?.世界?.时间 ?? '');
const worldParts = computed(() =>
  /(?:\d{4}[-/年])?(\d{1,2})[-/月](\d{1,2})[日\sT]+(\d{1,2}):(\d{2})/.exec(worldTime.value),
);
const time = computed(() =>
  worldParts.value
    ? `${worldParts.value[3].padStart(2, '0')}:${worldParts.value[4]}`
    : (worldTime.value.match(/\b\d{1,2}:\d{2}\b/)?.[0] ?? '--:--'),
);
const dateLabel = computed(() =>
  worldParts.value
    ? `${Number(worldParts.value[1])}月${Number(worldParts.value[2])}日`
    : worldTime.value || '世界时间未设置',
);
const worldDay = computed(() => Number(worldParts.value?.[2]) || 1);
const selectedApp = computed(() => [...apps, ...dockApps].find(app => app.name === activeApp.value));
let hostWindow: Window | null = null;
let drag: { kind: 'launcher' | 'phone'; x: number; y: number; left: number; top: number; pointerId: number } | null =
  null;
let didDrag = false;
let controlSwipeStart = 0;
const homeSwipeStart = ref(0);
let homeSwipeHandled = false;
function startHomeSwipe(event: PointerEvent) {
  homeSwipeStart.value = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function activateHome() {
  if (homeSwipeHandled) {
    homeSwipeHandled = false;
    return;
  }
  if (controlCenterOpen.value) controlCenterOpen.value = false;
  else if (activeApp.value) activeApp.value = null;
  else closePhone();
}
function finishHomeSwipe(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  if (homeSwipeStart.value - event.clientY < 35) return;
  homeSwipeHandled = true;
  if (controlCenterOpen.value) controlCenterOpen.value = false;
  else if (activeApp.value) activeApp.value = null;
  else closePhone();
  setTimeout(() => {
    homeSwipeHandled = false;
  }, 0);
}

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
  try {
    wallpaper.value = readPhoneWallpaper();
  } catch (error) {
    console.error('手机壁纸读取失败', error);
  }
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
});
onUnmounted(() => {
  hostWindow?.removeEventListener('resize', onResize);
});
</script>

<style src="./styles/phone.css"></style>
