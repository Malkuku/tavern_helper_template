<template>
  <main class="home-screen">
    <div class="home-heading">
      <span>今天</span>
      <strong>{{ dateLabel }}</strong>
    </div>

    <div class="app-grid" data-layout-empty="true">
      <button
        v-for="item in layout.desktop"
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
        @pointermove="moveIconDrag"
        @pointerup="endIconDrag"
        @pointercancel="cancelIconDrag"
        @click="openItem(item)"
      >
        <DesktopAppIcon v-if="item.kind === 'app'" :name="item.name" :today="today" />
        <span v-else class="app-icon folder-icon" aria-hidden="true">
          <span
            v-for="name in item.apps.slice(0, 4)"
            :key="name"
            class="folder-mini"
            :style="{ background: appColor(name) }"
          ></span>
        </span>
        <span>{{ item.name }}</span>
      </button>
    </div>

    <div class="home-spacer" data-layout-empty="true"></div>
    <div class="page-dots" aria-hidden="true"><span></span><span></span></div>
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
        @pointermove="moveIconDrag"
        @pointerup="endIconDrag"
        @pointercancel="cancelIconDrag"
        @click="openApp(name)"
      >
        <DesktopAppIcon :name="name" :today="today" />
      </button>
    </div>

    <div v-if="selectedFolder" class="folder-overlay" @click.self="folderId = null">
      <section class="folder-panel" :aria-label="selectedFolder.name">
        <div class="folder-header">
          <input v-model="selectedFolder.name" aria-label="文件夹名称" maxlength="20" @change="saveLayout" />
          <button type="button" aria-label="关闭文件夹" @click="folderId = null">×</button>
        </div>
        <div class="folder-grid">
          <div v-for="name in selectedFolder.apps" :key="name" class="folder-app">
            <button type="button" class="app-tile" @click="openApp(name)">
              <DesktopAppIcon :name="name" :today="today" />
              <span>{{ name }}</span>
            </button>
            <button class="folder-remove" type="button" :aria-label="`将${name}移出文件夹`" @click="moveOut(name)">
              移出
            </button>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="drag?.moved"
      class="icon-drag-preview"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
      aria-hidden="true"
    >
      <DesktopAppIcon v-if="drag.source.kind === 'app'" :name="drag.source.name" :today="today" />
      <span v-else class="app-icon folder-icon">▦</span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apps, dockApps } from '../desktopApps';
import {
  defaultPhoneLayout,
  itemKey,
  movePhoneItem,
  normalizePhoneLayout,
  takeAppOutOfFolder,
  type DesktopItem,
  type DragItem,
  type DropTarget,
  type PhoneLayout,
} from '../desktopLayout';
import DesktopAppIcon from './DesktopAppIcon.vue';

defineProps<{ dateLabel: string; today: number }>();
const emit = defineEmits<{ open: [name: string] }>();
const layout = ref<PhoneLayout>(defaultPhoneLayout());
const folderId = ref<string | null>(null);
const selectedFolder = computed(
  () =>
    layout.value.desktop.find(item => item.kind === 'folder' && item.id === folderId.value) as
      | Extract<DesktopItem, { kind: 'folder' }>
      | undefined,
);
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
} | null>(null);
let suppressClick = false;

function appColor(name: string) {
  return [...apps, ...dockApps].find(app => app.name === name)?.color ?? '#777';
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
function moveOut(name: string) {
  if (!folderId.value) return;
  layout.value = takeAppOutOfFolder(layout.value, folderId.value, name);
  if (!selectedFolder.value) folderId.value = null;
  saveLayout();
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
  };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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
  if (element?.closest('[data-layout-empty]')) return { zone: 'empty' };
  return null;
}
function moveIconDrag(event: PointerEvent) {
  const current = drag.value;
  if (!current || current.pointerId !== event.pointerId) return;
  current.x = event.clientX;
  current.y = event.clientY;
  if (!current.moved && Math.hypot(current.x - current.startX, current.y - current.startY) < 7) return;
  current.moved = true;
  const target = targetAt(event);
  hoverKey.value = target?.zone === 'desktop' ? target.key : target?.zone === 'dock' ? `dock:${target.key}` : null;
  hoverPlacement.value = target?.zone === 'desktop' || target?.zone === 'dock' ? target.placement : null;
}
function endIconDrag(event: PointerEvent) {
  const current = drag.value;
  if (!current || current.pointerId !== event.pointerId) return;
  const target = current.moved ? targetAt(event) : null;
  if (current.moved) {
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (target) {
      const next = movePhoneItem(layout.value, current.source, target, crypto.randomUUID());
      if (next !== layout.value) {
        layout.value = next;
        saveLayout();
      }
    }
  }
  cancelIconDrag(event);
}
function cancelIconDrag(event: PointerEvent) {
  if (drag.value?.pointerId !== event.pointerId) return;
  drag.value = null;
  hoverKey.value = null;
  hoverPlacement.value = null;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
}

onMounted(readLayout);
</script>
