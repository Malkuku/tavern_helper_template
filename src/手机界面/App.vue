<template>
  <div class="phone-module">
    <Transition name="phone-shell" mode="out-in">
      <button
        v-if="!open"
        ref="launcherButton"
        class="phone-launcher"
        :class="{
          'has-unread': wechatUnread || witchNotices.length > 0 || rewardMailUnread,
          'initialization-ready': statStore.initializationNoticePending,
        }"
        type="button"
        :style="launcherStyle"
        :aria-label="`打开手机界面${wechatUnread ? '，Weline 有未读消息或好友申请' : ''}${witchNotices.length ? '，魔女恶堕计划有提醒' : ''}${rewardMailUnread ? '，有未读奖励邮件' : ''}，拖拽可移动`"
        @pointerdown="startDrag($event, 'launcher')"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @click="openPhone"
      >
        <span class="launcher-device" aria-hidden="true"><span class="launcher-display"></span></span>
        <span v-if="statStore.initializationNoticePending" class="launcher-particles" aria-hidden="true">
          <span v-for="index in 6" :key="index"></span>
        </span>
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
              <span class="status-time">{{ time }}</span>
              <span class="dynamic-island" aria-hidden="true"></span>
              <button
                class="control-trigger"
                type="button"
                aria-label="打开控制中心"
                @click="controlCenterOpen = true"
                @pointerdown="startControlSwipe"
                @pointerup="endControlSwipe"
              >
                <svg class="status-signal" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
                  <rect x="0" y="8" width="3" height="4" rx="0.7" />
                  <rect x="5" y="6" width="3" height="6" rx="0.7" />
                  <rect x="10" y="3" width="3" height="9" rx="0.7" />
                  <rect x="15" y="0" width="3" height="12" rx="0.7" />
                </svg>
                <svg class="status-wifi" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                  <path
                    d="M1 3.7a10.5 10.5 0 0 1 14 0M3.5 6.3a6.8 6.8 0 0 1 9 0M6 8.8a3.1 3.1 0 0 1 4 0"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <circle cx="8" cy="11" r="1" fill="currentColor" />
                </svg>
                <svg class="status-battery" viewBox="0 0 25 12" fill="none" aria-hidden="true">
                  <rect x="0.7" y="0.7" width="20" height="10.6" rx="2.7" stroke="currentColor" stroke-width="1.4" />
                  <rect x="2.7" y="2.7" width="15" height="6.6" rx="1.2" fill="currentColor" />
                  <path d="M22 3.4c1.4.4 2.2 1.4 2.2 2.6s-.8 2.2-2.2 2.6V3.4Z" fill="currentColor" />
                </svg>
              </button>
            </header>

            <Transition name="phone-view" mode="out-in">
              <PhoneDesktop
                v-if="!activeApp"
                :key="'desktop'"
                :date-label="dateLabel"
                :today="worldDay"
                :wechat-unread="wechatUnread"
                :witch-unread="witchNotices.length > 0"
                :message-unread="rewardMailUnread"
                :connectivity-unchecked="!connectivityChecked"
                @open="openDesktopApp"
              />

              <main v-else-if="activeApp === '微信'" :key="'wechat'" class="wechat-screen">
                <WeChat :open-request="chatOpenRequest" @open-map="openMapLocation" />
              </main>

              <main v-else-if="activeApp === '角色编辑器'" :key="'role-editor'" class="role-editor-screen">
                <RoleEditor ref="roleEditorRef" @leave="leaveRoleEditor" />
              </main>

              <main v-else-if="activeApp === '魔女恶堕计划'" :key="'witch-app'" class="data-app-screen">
                <WitchApp :open-request="witchOpenRequest" />
              </main>

              <PhoneUtilities
                v-else-if="['备忘录', '电话', '日历', '天气'].includes(activeApp)"
                :key="activeApp"
                :app="activeApp"
              />

              <MapApp v-else-if="activeApp === '地图'" :key="activeApp" :open-request="mapOpenRequest" />

              <ConnectivityApp
                v-else-if="activeApp === '连接诊断'"
                :key="activeApp"
                @checked="markConnectivityChecked"
              />

              <PhoneExtras
                v-else-if="['信息', '照片', '相机', '设置', '浏览器', '音乐', '文件'].includes(activeApp)"
                :key="activeApp"
                :app="activeApp"
                @wallpaper-changed="wallpaper = $event"
                @test-notifications="startNotificationPreview"
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
              />
            </Transition>

            <WeChatNotification
              v-if="notificationPreview?.kind === 'weline'"
              :data="previewWeChatData"
              :notice="previewWeChatNotice"
              @open="advanceNotificationPreview"
              @close="advanceNotificationPreview"
            />
            <WitchNotification
              v-else-if="notificationPreview?.kind === 'witch'"
              :notice="notificationPreview.notice"
              @open="advanceNotificationPreview"
              @close="advanceNotificationPreview"
            />
            <WeChatNotification
              v-else-if="statStore.wechatNotification && statStore.statData?.手机?.微信"
              :data="statStore.statData.手机.微信"
              :notice="statStore.wechatNotification"
              @open="openNotificationChat"
              @close="statStore.dismissWeChatNotification()"
            />
            <WitchNotification
              v-if="!notificationPreview && !statStore.wechatNotification && visibleWitchNotice"
              :notice="visibleWitchNotice"
              @open="openWitchNotice"
              @close="dismissWitchNotice"
            />

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
    <WeChatNotification
      v-if="!open && statStore.wechatNotification && statStore.statData?.手机?.微信"
      :data="statStore.statData.手机.微信"
      :notice="statStore.wechatNotification"
      @open="openNotificationChat"
      @close="statStore.dismissWeChatNotification()"
    />
    <WitchNotification
      v-if="!open && !statStore.wechatNotification && statStore.transientNotices[0]"
      :notice="statStore.transientNotices[0]"
      @open="openExternalWitchNotice"
      @close="dismissExternalWitchNotice"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useMagicGirlStatStore } from './store/StatStore';
import { incomingFriendRequests } from './apps/wechat/wechatData';
import WeChat from './apps/wechat/WeChat.vue';
import RoleEditor from './apps/roleEditor/RoleEditor.vue';
import WitchApp from './apps/witch/WitchApp.vue';
import PhoneUtilities from './apps/PhoneUtilities.vue';
import PhoneExtras from './apps/PhoneExtras.vue';
import MapApp from './apps/map/MapApp.vue';
import ConnectivityApp from './apps/connectivity/ConnectivityApp.vue';
import ControlCenter from './components/ControlCenter.vue';
import PhoneDesktop from './components/PhoneDesktop.vue';
import WeChatNotification from './components/WeChatNotification.vue';
import WitchNotification from './components/WitchNotification.vue';
import {
  activeWitchNoticeHistory,
  nextWitchNotice,
  refreshSuccessNotice,
  witchNotices as collectWitchNotices,
  type WitchNotice,
} from './apps/witch/witchNotifications';
import { apps, dockApps } from './desktopApps';
import { readPhoneWallpaper } from './wallpaper';
import type { 微信数据, 微信消息 } from './types';

const open = ref(false);
const statStore = useMagicGirlStatStore();
type NotificationPreview = { kind: 'weline' } | { kind: 'witch'; notice: WitchNotice };
const notificationPreviewQueue = ref<NotificationPreview[]>([]);
const notificationPreview = computed(() => notificationPreviewQueue.value[0] ?? null);
const previewWeChatData: 微信数据 = {
  账号: {
    user: { 昵称: '我', 头像: '', 表情包: {}, 好友: ['通知测试'] },
    通知测试: { 昵称: '通知测试', 头像: '', 表情包: {}, 好友: ['user'] },
  },
  会话: { '私聊:user&通知测试': { 类型: '私聊', 成员: ['user', '通知测试'], 消息: [] } },
  准备发送: null,
};
const previewWeChatNotice: { key: string; message: 微信消息 } = {
  key: '私聊:user&通知测试',
  message: { 楼层ID: 0, 发送者: '通知测试', 时间: '', 内容: ['这是一条 Weline 消息预览。'] },
};
function startNotificationPreview() {
  const sample = (title: string, message: string, warning = false): NotificationPreview => ({
    kind: 'witch',
    notice: { key: `preview:${title}`, title, message, tab: 'observe', warning },
  });
  notificationPreviewQueue.value = [
    { kind: 'weline' },
    sample('任务奖励待领取', '1 项任务已完成，打开任务页领取奖励。'),
    sample('创伤稳定度警告', '示例角色当前为 2 级，建议查看观测档案。', true),
    sample('示例角色的创伤稳定度等级下降', '3 级 → 2 级，点击查看当前状态。', true),
    sample('示例角色的好感度等级提升', '1 级 → 2 级，点击查看当前状态。'),
    sample('示例角色的恶堕度等级提升', '0 级 → 1 级，点击查看当前状态。'),
    { kind: 'witch', notice: refreshSuccessNotice('任务') },
    { kind: 'witch', notice: refreshSuccessNotice('技能') },
    { kind: 'witch', notice: refreshSuccessNotice('道具') },
  ];
}
function advanceNotificationPreview() {
  notificationPreviewQueue.value = notificationPreviewQueue.value.slice(1);
}
const wechatUnread = computed(
  () => statStore.unreadChatKeys.length > 0 || incomingFriendRequests(statStore.statData?.手机?.微信).length > 0,
);
const rewardMailUnread = computed(() => !!statStore.statData?.手机.恶堕奖励.邮件.some(mail => !mail.已读));
const activeApp = ref<string | null>(null);
watch([activeApp, open], ([app, isOpen]) => {
  if (!isOpen || app !== '设置') notificationPreviewQueue.value = [];
});
const connectivityChecked = ref(false);
async function markConnectivityChecked() {
  if (connectivityChecked.value) return;
  try {
    await Promise.resolve(
      updateVariablesWith(variables => ({ ...variables, magicGirlConnectivityChecked: true }), {
        type: 'script',
        script_id: getScriptId(),
      }),
    );
    connectivityChecked.value = true;
  } catch (error) {
    console.error('连接诊断检查记录保存失败', error);
  }
}
const roleEditorRef = ref<InstanceType<typeof RoleEditor> | null>(null);
function leaveRoleEditor() {
  activeApp.value = null;
}
const chatOpenRequest = ref<{ key: string; id: number } | null>(null);
const witchOpenRequest = ref<{
  tab: 'tasks' | 'observe' | 'shop';
  target?: string;
  shop?: '技能商店' | '道具商店';
  id: number;
} | null>(null);
let witchOpenRequestId = 0;
const witchNotices = computed(() => [...statStore.transientNotices, ...collectWitchNotices(statStore.statData)]);
const visibleWitchNotice = ref<WitchNotice | null>(null);
let witchNoticeChatId: string | null = null;
let witchNoticeHistory: string[] = [];
function saveWitchNoticeHistory() {
  if (!witchNoticeChatId) return;
  const chatId = witchNoticeChatId;
  const history = [...witchNoticeHistory];
  try {
    void Promise.resolve(
      updateVariablesWith(
        variables => ({
          ...variables,
          magicGirlWitchNoticeHistory: { ...(variables.magicGirlWitchNoticeHistory || {}), [chatId]: history },
        }),
        { type: 'script', script_id: getScriptId() },
      ),
    ).catch(error => console.error('应用通知记录保存失败', error));
  } catch (error) {
    console.error('应用通知记录保存失败', error);
  }
}
function syncWitchNotice() {
  if (!statStore.statData) {
    visibleWitchNotice.value = null;
    return;
  }
  const chatId = SillyTavern.getCurrentChatId();
  if (witchNoticeChatId !== chatId) {
    witchNoticeChatId = chatId;
    visibleWitchNotice.value = null;
    try {
      const stored: unknown = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlWitchNoticeHistory?.[
        chatId
      ];
      witchNoticeHistory = Array.isArray(stored) ? stored.filter((key): key is string => typeof key === 'string') : [];
    } catch (error) {
      console.error('应用通知记录读取失败', error);
      witchNoticeHistory = [];
    }
  }
  if (notificationPreview.value) return;
  const active = activeWitchNoticeHistory(witchNoticeHistory, witchNotices.value);
  const historyChanged = active.length !== witchNoticeHistory.length;
  if (historyChanged) {
    witchNoticeHistory = active;
  }
  if (visibleWitchNotice.value && !witchNotices.value.some(notice => notice.key === visibleWitchNotice.value?.key))
    visibleWitchNotice.value = null;
  if (!open.value || statStore.wechatNotification) {
    if (
      !open.value &&
      visibleWitchNotice.value &&
      statStore.transientNotices.some(notice => notice.key === visibleWitchNotice.value?.key)
    )
      statStore.dismissTransientNotice(visibleWitchNotice.value.key);
    visibleWitchNotice.value = null;
    if (historyChanged) saveWitchNoticeHistory();
    return;
  }
  if (visibleWitchNotice.value) {
    if (historyChanged) saveWitchNoticeHistory();
    return;
  }
  const next = nextWitchNotice(witchNotices.value, witchNoticeHistory);
  if (!next) {
    if (historyChanged) saveWitchNoticeHistory();
    return;
  }
  witchNoticeHistory = [...witchNoticeHistory, next.key];
  visibleWitchNotice.value = next;
  saveWitchNoticeHistory();
}
watch([witchNotices, () => statStore.wechatNotification, open, notificationPreview], syncWitchNotice, {
  immediate: true,
});
function dismissWitchNotice() {
  const key = visibleWitchNotice.value?.key;
  visibleWitchNotice.value = null;
  if (key) statStore.dismissTransientNotice(key);
  syncWitchNotice();
}
function openWitchNotice() {
  const notice = visibleWitchNotice.value;
  if (!notice) return;
  controlCenterOpen.value = false;
  activeApp.value = '魔女恶堕计划';
  witchOpenRequest.value = { tab: notice.tab, target: notice.target, shop: notice.shop, id: ++witchOpenRequestId };
  dismissWitchNotice();
}
function openExternalWitchNotice() {
  const notice = statStore.transientNotices[0];
  if (!notice) return;
  statStore.dismissTransientNotice(notice.key);
  openPhone();
  controlCenterOpen.value = false;
  activeApp.value = '魔女恶堕计划';
  witchOpenRequest.value = { tab: notice.tab, target: notice.target, shop: notice.shop, id: ++witchOpenRequestId };
}
function dismissExternalWitchNotice() {
  const notice = statStore.transientNotices[0];
  if (notice) statStore.dismissTransientNotice(notice.key);
}
function openDesktopApp(name: string) {
  witchOpenRequest.value = null;
  activeApp.value = name;
}
const mapOpenRequest = ref<{ key: string; id: number } | null>(null);
let chatOpenRequestId = 0;
let mapOpenRequestId = 0;
function openMapLocation(key: string) {
  mapOpenRequest.value = { key, id: ++mapOpenRequestId };
  activeApp.value = '地图';
}
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
  else if (activeApp.value === '角色编辑器') roleEditorRef.value?.requestLeave();
  else if (activeApp.value) {
    activeApp.value = null;
    chatOpenRequest.value = null;
    mapOpenRequest.value = null;
  } else closePhone();
}
function finishHomeSwipe(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  if (homeSwipeStart.value - event.clientY < 35) return;
  homeSwipeHandled = true;
  if (controlCenterOpen.value) controlCenterOpen.value = false;
  else if (activeApp.value === '角色编辑器') roleEditorRef.value?.requestLeave();
  else if (activeApp.value) {
    activeApp.value = null;
    chatOpenRequest.value = null;
    mapOpenRequest.value = null;
  } else closePhone();
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
  statStore.setPhoneOpen(true);
  try {
    wallpaper.value = readPhoneWallpaper();
  } catch (error) {
    console.error('手机壁纸读取失败', error);
  }
}
function openNotificationChat() {
  const key = statStore.wechatNotification?.key;
  const session = key && statStore.statData?.手机?.微信?.会话[key];
  if (!key || !session?.成员.includes('user')) return;
  if (!open.value) {
    didDrag = false;
    openPhone();
  }
  controlCenterOpen.value = false;
  activeApp.value = '微信';
  chatOpenRequest.value = { key, id: ++chatOpenRequestId };
  statStore.dismissWeChatNotification();
}
function closePhone() {
  controlCenterOpen.value = false;
  open.value = false;
  statStore.setPhoneOpen(false);
  chatOpenRequest.value = null;
  mapOpenRequest.value = null;
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
  try {
    connectivityChecked.value =
      getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlConnectivityChecked === true;
  } catch (error) {
    console.error('连接诊断检查记录读取失败', error);
  }
  hostWindow = launcherButton.value?.ownerDocument.defaultView ?? null;
  hostWindow?.addEventListener('resize', onResize);
});
onUnmounted(() => {
  hostWindow?.removeEventListener('resize', onResize);
});
</script>

<style src="./styles/phone.css"></style>
