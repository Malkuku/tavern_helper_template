<template>
  <main
    class="home-screen"
    @pointermove="moveIconDrag"
    @pointerup="endIconDrag"
    @pointercancel="cancelIconDrag"
    @touchstart.passive="startPageTouch"
    @touchend="endPageTouch"
  >
    <div class="home-heading">
      <span>今天</span>
      <strong>{{ dateLabel }}</strong>
    </div>

    <Transition name="desktop-page" mode="out-in">
      <div :key="page" class="app-grid" data-layout-empty="true">
        <button
          v-for="item in visibleItems"
          :key="itemKey(item)"
          class="app-tile"
          :class="{
            'layout-drop-target': hoverKey === itemKey(item),
            'layout-drop-inside': hoverKey === itemKey(item) && hoverPlacement === 'inside',
          }"
          type="button"
          data-layout-zone="desktop"
          :data-layout-key="itemKey(item)"
          @pointerdown="
            startIconDrag(
              $event,
              item.kind === 'app' ? { kind: 'app', name: item.name } : { kind: 'folder', id: item.id },
            )
          "
          @click="openItem(item)"
        >
          <DesktopAppIcon v-if="item.kind === 'app'" :name="item.name" :today="today" />
          <span v-else class="app-icon folder-icon" aria-hidden="true">
            <span v-for="name in item.apps.slice(0, 4)" :key="name" class="folder-mini">
              <DesktopAppIcon :name="name" :today="today" />
            </span>
          </span>
          <span>{{ item.kind === 'app' ? appDisplayName(item.name) : item.name }}</span>
        </button>
      </div>
    </Transition>

    <div class="home-spacer" data-layout-empty="true"></div>
    <div class="page-dots" aria-label="桌面分页">
      <button
        v-for="index in pageCount"
        :key="index"
        type="button"
        :class="{ active: page === index - 1 }"
        :aria-label="`第${index}页`"
        @click="page = index - 1"
      ></button>
    </div>
    <div class="dock" data-layout-dock-empty="true">
      <button
        v-for="name in layout.dock"
        :key="name"
        class="dock-tile"
        :class="{ 'layout-drop-target': hoverKey === `dock:${name}` }"
        type="button"
        :aria-label="name"
        data-layout-zone="dock"
        :data-layout-key="name"
        @pointerdown="startIconDrag($event, { kind: 'app', name })"
        @click="openApp(name)"
      >
        <DesktopAppIcon :name="name" :today="today" />
      </button>
    </div>

    <Transition name="folder-open">
      <div v-if="selectedFolder" class="folder-overlay" data-layout-empty="true" @click.self="folderId = null">
        <section class="folder-panel" :aria-label="selectedFolder.name">
          <div class="folder-header">
            <input v-model="selectedFolder.name" aria-label="文件夹名称" maxlength="20" @change="saveLayout" />
            <button type="button" aria-label="关闭文件夹" @click="folderId = null">×</button>
          </div>
          <div class="folder-grid">
            <div v-for="name in selectedFolder.apps" :key="name" class="folder-app">
              <button
                type="button"
                class="app-tile"
                @pointerdown="startIconDrag($event, { kind: 'app', name })"
                @click="openApp(name)"
              >
                <DesktopAppIcon :name="name" :today="today" />
                <span>{{ appDisplayName(name) }}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <div
      v-if="drag?.moved"
      class="icon-drag-preview"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
      aria-hidden="true"
    >
      <DesktopAppIcon v-if="drag.source.kind === 'app'" :name="drag.source.name" :today="today" />
      <span v-else class="app-icon folder-icon">
        <span v-for="name in draggedFolderApps" :key="name" class="folder-mini">
          <DesktopAppIcon :name="name" :today="today" />
        </span>
      </span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { appDisplayName } from '../desktopApps';
import {
  defaultPhoneLayout,
  itemKey,
  movePhoneItem,
  normalizePhoneLayout,
  type DesktopItem,
  type DragItem,
  type DropTarget,
  type PhoneLayout,
} from '../desktopLayout';
import DesktopAppIcon from './DesktopAppIcon.vue';

defineProps<{ dateLabel: string; today: number }>();
const emit = defineEmits<{ open: [name: string] }>();
const layout = ref<PhoneLayout>(defaultPhoneLayout());
const page = ref(0);
const pageSize = 12;
const pageCount = computed(() => Math.max(1, Math.ceil(layout.value.desktop.length / pageSize)));
const visibleItems = computed(() => layout.value.desktop.slice(page.value * pageSize, (page.value + 1) * pageSize));
watch(pageCount, count => {
  if (page.value >= count) page.value = count - 1;
});
let pageTouchX = 0;
function startPageTouch(event: TouchEvent) {
  pageTouchX = event.changedTouches[0]?.clientX ?? 0;
}
function endPageTouch(event: TouchEvent) {
  if (skipPageTouch) {
    skipPageTouch = false;
    return;
  }
  if (drag.value?.moved || folderId.value) return;
  const dx = (event.changedTouches[0]?.clientX ?? pageTouchX) - pageTouchX;
  if (Math.abs(dx) > 50) {
    page.value = Math.max(0, Math.min(pageCount.value - 1, page.value + (dx < 0 ? 1 : -1)));
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
}
const folderId = ref<string | null>(null);
const selectedFolder = computed(
  () =>
    layout.value.desktop.find(item => item.kind === 'folder' && item.id === folderId.value) as
      | Extract<DesktopItem, { kind: 'folder' }>
      | undefined,
);
const draggedFolderApps = computed(() => {
  if (drag.value?.source.kind !== 'folder') return [];
  const folder = layout.value.desktop.find(item => item.kind === 'folder' && item.id === drag.value?.source.id);
  return folder?.kind === 'folder' ? folder.apps.slice(0, 4) : [];
});
const hoverKey = ref<string | null>(null);
const hoverPlacement = ref<'before' | 'after' | 'inside' | null>(null);
const drag = ref<{
  source: DragItem;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  armed: boolean;
} | null>(null);
let suppressClick = false;
let skipPageTouch = false;
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let edgeTimer: ReturnType<typeof setTimeout> | null = null;
let edgeDirection = 0;
function clearEdgeTurn() {
  if (edgeTimer) clearTimeout(edgeTimer);
  edgeTimer = null;
  edgeDirection = 0;
}
function queueEdgeTurn(direction: number) {
  if (direction === edgeDirection) return;
  clearEdgeTurn();
  if (!direction) return;
  edgeDirection = direction;
  edgeTimer = setTimeout(() => {
    page.value = Math.max(0, Math.min(pageCount.value - 1, page.value + direction));
    clearEdgeTurn();
  }, 420);
}
function readLayout() {
  try {
    layout.value = normalizePhoneLayout(
      getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlPhoneLayout,
    );
  } catch (error) {
    console.error('手机桌面布局读取失败', error);
  }
}
function saveLayout() {
  try {
    const snapshot = JSON.parse(JSON.stringify(layout.value)) as PhoneLayout;
    updateVariablesWith(variables => ({ ...variables, magicGirlPhoneLayout: snapshot }), {
      type: 'script',
      script_id: getScriptId(),
    });
  } catch (error) {
    console.error('手机桌面布局保存失败', error);
  }
}
function openApp(name: string) {
  if (!suppressClick) emit('open', name);
}
function openItem(item: DesktopItem) {
  if (suppressClick) return;
  if (item.kind === 'folder') folderId.value = item.id;
  else emit('open', item.name);
}
function startIconDrag(event: PointerEvent, source: DragItem) {
  if (event.button !== 0) return;
  drag.value = {
    source,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: event.clientX,
    y: event.clientY,
    moved: false,
    armed: event.pointerType !== 'touch',
  };
  if (event.pointerType === 'touch') {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (drag.value?.pointerId === event.pointerId) drag.value.armed = true;
      holdTimer = null;
    }, 320);
  }
}
function targetAt(event: PointerEvent): DropTarget | null {
  const element = (event.currentTarget as HTMLElement).ownerDocument.elementFromPoint(
    event.clientX,
    event.clientY,
  ) as HTMLElement | null;
  const tile = element?.closest<HTMLElement>('[data-layout-zone]');
  if (tile?.dataset.layoutZone === 'desktop') {
    const rect = tile.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    return {
      zone: 'desktop',
      key: tile.dataset.layoutKey!,
      placement: fraction < 0.25 ? 'before' : fraction > 0.75 ? 'after' : 'inside',
    };
  }
  if (tile?.dataset.layoutZone === 'dock') {
    const rect = tile.getBoundingClientRect();
    return {
      zone: 'dock',
      key: tile.dataset.layoutKey!,
      placement: event.clientX < rect.left + rect.width / 2 ? 'before' : 'after',
    };
  }
  if (element?.closest('[data-layout-dock-empty]')) return { zone: 'dock-empty' };
  if (folderId.value && element?.closest('.folder-overlay') && !element?.closest('.folder-panel'))
    return { zone: 'empty' };
  if (element?.closest('[data-layout-empty]')) return { zone: 'empty' };
  return null;
}
function moveIconDrag(event: PointerEvent) {
  const current = drag.value;
  if (!current || current.pointerId !== event.pointerId) return;
  current.x = event.clientX;
  current.y = event.clientY;
  if (!current.armed) {
    if (Math.hypot(current.x - current.startX, current.y - current.startY) > 7 && holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    return;
  }
  if (!current.moved && Math.hypot(current.x - current.startX, current.y - current.startY) < 7) return;
  if (!current.moved) (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  current.moved = true;
  const home = event.currentTarget as HTMLElement;
  const bounds = home.getBoundingClientRect();
  const dockTop = home.querySelector('.dock')?.getBoundingClientRect().top ?? bounds.bottom;
  const direction =
    !folderId.value && event.clientY >= bounds.top && event.clientY < dockTop
      ? event.clientX < bounds.left + 28 && page.value > 0
        ? -1
        : event.clientX > bounds.right - 28 && page.value < pageCount.value - 1
          ? 1
          : 0
      : 0;
  queueEdgeTurn(direction);
  const target = targetAt(event);
  hoverKey.value = target?.zone === 'desktop' ? target.key : target?.zone === 'dock' ? `dock:${target.key}` : null;
  hoverPlacement.value = target?.zone === 'desktop' || target?.zone === 'dock' ? target.placement : null;
}
function endIconDrag(event: PointerEvent) {
  const current = drag.value;
  if (!current || current.pointerId !== event.pointerId) return;
  clearEdgeTurn();
  const target = current.moved ? targetAt(event) : null;
  if (current.moved) {
    if (event.pointerType === 'touch') skipPageTouch = true;
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (target) {
      const destination: DropTarget =
        target.zone === 'empty' && !folderId.value
          ? { zone: 'page', index: Math.min((page.value + 1) * pageSize - 1, layout.value.desktop.length) }
          : target;
      const next = movePhoneItem(layout.value, current.source, destination, crypto.randomUUID());
      if (next !== layout.value) {
        layout.value = next;
        if (!selectedFolder.value) folderId.value = null;
        saveLayout();
      }
    }
  }
  cancelIconDrag(event);
}
function cancelIconDrag(event: PointerEvent) {
  if (drag.value?.pointerId !== event.pointerId) return;
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
  clearEdgeTurn();
  drag.value = null;
  hoverKey.value = null;
  hoverPlacement.value = null;
  const target = (event.currentTarget as HTMLElement).closest<HTMLElement>('.home-screen');
  if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
}

onMounted(readLayout);
onUnmounted(() => {
  if (holdTimer) clearTimeout(holdTimer);
  clearEdgeTurn();
});
</script>
