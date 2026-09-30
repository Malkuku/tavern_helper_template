<template>
  <section class="wx-library" aria-label="Weline 图片库">
    <div class="wx-manager-section-head">
      <div>
        <small>MEDIA LIBRARY</small>
        <h2>图片库</h2>
      </div>
      <label class="wx-manager-primary"
        >＋ 上传图片<input type="file" accept="image/*" multiple @change="upload"
      /></label>
    </div>
    <p class="wx-library-help">点选图片可复制地址，或设为当前账号的头像、表情包。</p>

    <div class="wx-library-folder-head"><strong>文件分类</strong><span>移动分类不会影响已使用的图片</span></div>
    <div class="wx-library-folders" aria-label="一级文件夹">
      <button type="button" :class="{ active: activeGroupId === null }" @click="selectGroup(null)">全部</button>
      <button
        type="button"
        :class="{ active: activeGroupId === 'uncategorized' }"
        @click="selectGroup('uncategorized')"
      >
        未分类
      </button>
      <button
        v-for="group in categories.groups"
        :key="group.id"
        type="button"
        :class="{ active: activeGroupId === group.id }"
        @click="selectGroup(group.id)"
      >
        {{ group.name }}
      </button>
    </div>
    <div v-if="activeGroup" class="wx-library-subfolders">
      <div class="wx-library-folders" aria-label="二级文件夹">
        <button type="button" :class="{ active: activeFolderId === null }" @click="selectFolder(null)">全部</button>
        <button type="button" :class="{ active: activeFolderId === '' }" @click="selectFolder('')">本级图片</button>
        <button
          v-for="folder in activeGroup.folders"
          :key="folder.id"
          type="button"
          :class="{ active: activeFolderId === folder.id }"
          @click="selectFolder(folder.id)"
        >
          {{ folder.name }}
        </button>
      </div>
    </div>

    <div class="wx-library-results">
      <strong>图片</strong><span>{{ visibleImages.length }} / {{ images.length }}</span>
    </div>
    <p v-if="!images.length" class="wx-manager-empty">图片库还是空的。上传图片后，缩略图和引用会显示在这里。</p>
    <p v-else-if="!visibleImages.length" class="wx-manager-empty">
      这个文件夹还没有图片，可上传或从其他文件夹移动图片。
    </p>
    <div v-else class="wx-library-grid">
      <button
        v-for="[url, data] in visibleImages"
        :key="url"
        type="button"
        :class="{ active: selectedUrl === url }"
        :aria-label="`查看图片 ${imageIdFromUrl(url)}`"
        @click="selectImage(url)"
      >
        <img :src="data" alt="" /><span>{{ imageIdFromUrl(url).slice(0, 8) }}</span>
      </button>
    </div>
    <div v-if="selectedImage" ref="selectionElement" class="wx-library-selection">
      <img :src="selectedImage[1]" alt="当前选中的图片" />
      <div class="wx-library-selection-body">
        <strong>当前图片</strong>
        <small>{{ usedImages.has(selectedImage[0]) ? '当前账号正在引用' : '可供账号引用' }}</small>
        <label
          >图片引用<input ref="referenceInput" readonly :value="selectedImage[0]" @focus="referenceInput?.select()"
        /></label>
        <div class="wx-library-actions">
          <button type="button" @click="copyReference">复制引用</button>
          <button type="button" :disabled="!assignable" @click="emit('avatar', selectedImage[0])">设为头像</button>
          <button type="button" :disabled="!assignable" @click="emit('sticker', selectedImage[0])">选作表情</button>
        </div>
        <small v-if="!assignable">请先为当前角色创建账号，再选用图片。</small>
        <label
          >移动到文件夹
          <select :value="selectedPlacement" @change="moveSelected">
            <option value="">未分类</option>
            <template v-for="group in categories.groups" :key="group.id">
              <option :value="group.id">{{ group.name }} / 本级</option>
              <option v-for="folder in group.folders" :key="folder.id" :value="`${group.id}:${folder.id}`">
                {{ group.name }} / {{ folder.name }}
              </option>
            </template>
          </select>
        </label>
        <button
          class="wx-library-delete"
          type="button"
          :disabled="usedImages.has(selectedImage[0])"
          @click="removeSelected"
        >
          清理这张图片
        </button>
      </div>
    </div>
    <details class="wx-library-organize">
      <summary>管理文件夹</summary>
      <form class="wx-library-inline-form" @submit.prevent="addGroup">
        <input v-model="newGroupName" maxlength="30" placeholder="新建一级文件夹" aria-label="一级文件夹名称" />
        <button type="submit">新建一级</button>
      </form>
      <template v-if="activeGroup">
        <form class="wx-library-inline-form" @submit.prevent="addFolder">
          <input v-model="newFolderName" maxlength="30" placeholder="新建二级文件夹" aria-label="二级文件夹名称" />
          <button type="submit">新建二级</button>
        </form>
        <div class="wx-library-inline-form">
          <input v-model="renameName" maxlength="30" aria-label="当前文件夹新名称" />
          <button type="button" @click="renameCurrent">改名</button>
          <button type="button" class="danger" @click="deleteCurrent">删除</button>
        </div>
      </template>
    </details>
    <p v-if="notice" class="wx-manager-notice" role="status">{{ notice }}</p>
    <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { 微信数据 } from '../../types';
import {
  createImageFolder,
  createImageGroup,
  deleteImageFolder,
  deleteImageGroup,
  placeImage,
  readImageCategories,
  renameImageFolder,
  renameImageGroup,
} from './imageCategories';
import {
  deleteWechatImage,
  imageIdFromUrl,
  imageLibraryEntries,
  imageReferences,
  readWechatImageFile,
  refreshWechatImageLibrary,
  storeWechatImage,
} from './imageLibrary';

const props = defineProps<{ accounts: 微信数据['账号']; assignable: boolean }>();
const emit = defineEmits<{ avatar: [url: string]; sticker: [url: string] }>();
refreshWechatImageLibrary();
const images = ref(imageLibraryEntries());
const categories = ref(readImageCategories());
const activeGroupId = ref<string | null>(null);
const activeFolderId = ref<string | null>(null);
const selectedUrl = ref('');
const selectionElement = ref<HTMLElement | null>(null);
const referenceInput = ref<HTMLInputElement | null>(null);
const newGroupName = ref('');
const newFolderName = ref('');
const renameName = ref('');
const notice = ref('');
const error = ref('');
const activeGroup = computed(() => categories.value.groups.find(group => group.id === activeGroupId.value));
const usedImages = computed(() => imageReferences(props.accounts));
const visibleImages = computed(() =>
  images.value.filter(([url]) => {
    const place = categories.value.placements[imageIdFromUrl(url)];
    if (activeGroupId.value === null) return true;
    if (activeGroupId.value === 'uncategorized') return !place;
    if (place?.groupId !== activeGroupId.value) return false;
    return activeFolderId.value === null || place.folderId === (activeFolderId.value || null);
  }),
);
const selectedImage = computed(() => visibleImages.value.find(([url]) => url === selectedUrl.value));
const selectedPlacement = computed(() => {
  const place = categories.value.placements[imageIdFromUrl(selectedUrl.value)];
  return place ? `${place.groupId}${place.folderId ? `:${place.folderId}` : ''}` : '';
});

function selectGroup(id: string | null) {
  activeGroupId.value = id;
  activeFolderId.value = null;
  renameName.value = categories.value.groups.find(group => group.id === id)?.name ?? '';
  selectedUrl.value = '';
}
function selectFolder(id: string | null) {
  activeFolderId.value = id;
  renameName.value = activeGroup.value?.folders.find(folder => folder.id === id)?.name ?? activeGroup.value?.name ?? '';
  selectedUrl.value = '';
}
async function selectImage(url: string) {
  selectedUrl.value = url;
  await nextTick();
  selectionElement.value?.scrollIntoView({ block: 'nearest' });
}
function runCategoryChange(change: () => typeof categories.value, message: string): boolean {
  try {
    categories.value = change();
    notice.value = message;
    error.value = '';
    return true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '文件夹操作失败。';
    return false;
  }
}
function addGroup() {
  const name = newGroupName.value.trim();
  if (!runCategoryChange(() => createImageGroup(name), '一级文件夹已创建。')) return;
  const group = categories.value.groups.find(item => item.name === name);
  if (group) {
    selectGroup(group.id);
    newGroupName.value = '';
  }
}
function addFolder() {
  if (!activeGroup.value) return;
  const name = newFolderName.value.trim();
  if (!runCategoryChange(() => createImageFolder(activeGroup.value!.id, name), '二级文件夹已创建。')) return;
  const folder = activeGroup.value.folders.find(item => item.name === name);
  if (folder) {
    selectFolder(folder.id);
    newFolderName.value = '';
  }
}
function renameCurrent() {
  if (!activeGroup.value) return;
  if (activeFolderId.value && activeFolderId.value !== '')
    runCategoryChange(
      () => renameImageFolder(activeGroup.value!.id, activeFolderId.value!, renameName.value),
      '二级文件夹已改名。',
    );
  else runCategoryChange(() => renameImageGroup(activeGroup.value!.id, renameName.value), '一级文件夹已改名。');
}
function deleteCurrent() {
  if (!activeGroup.value) return;
  const isFolder = !!activeFolderId.value;
  if (!window.confirm(`删除当前${isFolder ? '二级' : '一级'}文件夹？图片不会被删除。`)) return;
  if (isFolder) {
    if (
      !runCategoryChange(
        () => deleteImageFolder(activeGroup.value!.id, activeFolderId.value!),
        '二级文件夹已删除，图片移至本级。',
      )
    )
      return;
    selectFolder(null);
  } else {
    if (!runCategoryChange(() => deleteImageGroup(activeGroup.value!.id), '一级文件夹已删除，图片移至未分类。')) return;
    selectGroup('uncategorized');
  }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  if (!files.length) return;
  try {
    for (const file of files) {
      const url = storeWechatImage(await readWechatImageFile(file));
      if (activeGroup.value)
        categories.value = placeImage(imageIdFromUrl(url), activeGroup.value.id, activeFolderId.value || null);
      selectedUrl.value = url;
    }
    images.value = imageLibraryEntries();
    notice.value = `已上传 ${files.length} 张图片。`;
    error.value = '';
  } catch (cause) {
    images.value = imageLibraryEntries();
    error.value = cause instanceof Error ? cause.message : '图片上传失败。';
  }
  input.value = '';
}
function moveSelected(event: Event) {
  if (!selectedImage.value) return;
  const [groupId, folderId] = (event.target as HTMLSelectElement).value.split(':');
  runCategoryChange(
    () => placeImage(imageIdFromUrl(selectedImage.value![0]), groupId || null, folderId || null),
    '图片分类已更新，引用保持不变。',
  );
}
async function copyReference() {
  if (!selectedImage.value) return;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(selectedImage.value[0]);
    else {
      referenceInput.value?.select();
      if (!document.execCommand('copy')) throw new Error('复制失败，请长按引用字段手动复制。');
    }
    notice.value = '图片引用已复制。';
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '复制失败，请长按引用字段手动复制。';
  }
}
function removeSelected() {
  if (!selectedImage.value || !window.confirm('清理这张图片？此操作会删除图片库中的图片内容。')) return;
  try {
    deleteWechatImage(selectedImage.value[0], props.accounts);
    images.value = imageLibraryEntries();
    categories.value = readImageCategories();
    selectedUrl.value = '';
    notice.value = '图片已清理。';
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '图片清理失败。';
  }
}
</script>
