<template>
  <section class="wx-manager-editor wx-sticker-manager">
    <div class="wx-sticker-toolbar">
      <nav class="wx-manager-sticker-switch" aria-label="表情范围">
        <button type="button" :class="{ active: section === 'selected' }" @click="switchSection('selected')">
          {{ accountId === 'user' ? '我的表情' : '账号表情' }} · {{ Object.keys(account.表情包).length }}
        </button>
        <button type="button" :class="{ active: section === 'library' }" @click="switchSection('library')">
          共享表情 · {{ library.filter(([name]) => !preferences.archived.includes(name)).length }}
        </button>
      </nav>
      <button class="wx-manager-primary" type="button" :disabled="busy" @click="adding = !adding">
        {{ adding ? '收起添加' : '＋ 添加表情' }}
      </button>
      <p class="wx-manager-muted">
        正在管理 {{ account.昵称 || accountId }} 的表情，选用与移除会立即保存。共享表情需添加到此账号后才能发送。
      </p>
      <p v-if="notice" class="wx-manager-notice" role="status">{{ notice }}</p>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
    </div>

    <section v-if="adding" class="wx-manager-new-sticker" aria-label="添加表情">
      <div class="wx-sticker-import-actions">
        <label class="wx-manager-upload"
          >选择图片（可多选）<input type="file" accept="image/*" multiple :disabled="busy" @change="readFiles"
        /></label>
        <button type="button" :disabled="busy" @click="picking = !picking">
          {{ picking ? '收起图片选择' : '从图片库选择' }}
        </button>
      </div>
      <label><input v-model="cropUploads" type="checkbox" :disabled="busy" /> 上传前逐张裁剪（默认保留完整图片）</label>
      <WeChatImageLibrary v-show="picking" :accounts="accounts" :assignable="true" pick-only @sticker="queueImage" />
      <details>
        <summary>添加网络图片</summary>
        <form class="wx-sticker-import-actions" @submit.prevent="queueExternal">
          <input v-model="externalUrl" type="url" placeholder="https://…" aria-label="网络图片地址" :disabled="busy" />
          <button type="submit" :disabled="busy">加入待添加</button>
        </form>
      </details>
      <p v-if="!drafts.length" class="wx-manager-muted">选图后可统一检查名称，再一次添加到当前账号。</p>
      <div v-for="(draft, index) in drafts" :key="draft.id" class="wx-sticker-draft">
        <button
          class="wx-sticker-preview-button"
          type="button"
          :aria-label="`预览 ${draft.name || '待添加表情'}`"
          @click="preview = { name: draft.name, url: draft.url }"
        >
          <img :src="resolveWechatImage(draft.url)" alt="待添加表情" />
        </button>
        <label
          >表情名称<input
            v-model="draft.name"
            maxlength="30"
            :disabled="busy || draft.imported"
            placeholder="例如：开心"
          /><small v-if="draft.imported">已入共享库，等待添加到账号</small
          ><small v-if="draft.error" class="wx-error" role="alert">{{ draft.error }}</small></label
        >
        <button
          type="button"
          :disabled="busy"
          :aria-label="`取消添加第 ${index + 1} 张`"
          @click="drafts.splice(index, 1)"
        >
          移除
        </button>
      </div>
      <button v-if="drafts.length" class="wx-manager-primary" type="button" :disabled="busy" @click="importDrafts">
        {{ busy ? progress || '正在保存…' : `添加 ${drafts.length} 张到当前账号` }}
      </button>
    </section>

    <div class="wx-sticker-filters">
      <input v-model="search" type="search" placeholder="搜索表情名称" aria-label="搜索表情名称" />
      <select v-model="folder" aria-label="按图片文件夹筛选">
        <option value="">全部分类</option>
        <option value="uncategorized">未分类</option>
        <template v-for="group in categories.groups" :key="group.id"
          ><option :value="group.id">{{ group.name }}</option>
          <option v-for="child in group.folders" :key="child.id" :value="`${group.id}:${child.id}`">
            {{ group.name }} / {{ child.name }}
          </option></template
        >
      </select>
      <select v-model="order" aria-label="表情排序">
        <option value="favorites">常用优先</option>
        <option value="default">默认顺序</option>
        <option value="name">名称排序</option>
      </select>
      <label v-if="section === 'library'"><input v-model="showArchived" type="checkbox" /> 查看已归档</label>
    </div>
    <div class="wx-sticker-batchbar">
      <span>{{ visible.length }} 个结果 · 已勾选 {{ checked.length }} 个</span>
      <button type="button" :disabled="busy || !visible.length" @click="toggleAll">
        {{ checked.length === visible.length && visible.length ? '取消全选' : '全选结果' }}
      </button>
      <button
        type="button"
        :disabled="busy || !checked.length"
        @click="updateSelection(checked, section === 'library')"
      >
        {{ section === 'library' ? '批量选用' : '批量移除' }}
      </button>
      <button v-if="section === 'library'" type="button" :disabled="busy || !checked.length" @click="archiveChecked">
        {{ showArchived ? '恢复到共享库' : '归档所选' }}
      </button>
    </div>
    <div v-if="visible.length" class="wx-sticker-cards">
      <article v-for="[name, url] in visible" :key="name" class="wx-sticker-card">
        <label class="wx-sticker-check"
          ><input v-model="checked" type="checkbox" :value="name" :disabled="busy" :aria-label="`勾选 ${name}`"
        /></label>
        <button
          class="wx-sticker-preview-button"
          type="button"
          :aria-label="`预览 ${name}`"
          @click="preview = { name, url }"
        >
          <img v-if="resolveWechatImage(url)" :src="resolveWechatImage(url)" :alt="name" loading="lazy" /><span v-else
            >图片不可用</span
          >
        </button>
        <strong :title="name">{{ name }}</strong>
        <button
          type="button"
          :disabled="busy"
          :aria-pressed="preferences.favorites.includes(name)"
          @click="favorite(name)"
        >
          {{ preferences.favorites.includes(name) ? '★ 常用' : '☆ 设为常用' }}
        </button>
        <button
          type="button"
          :disabled="busy || (section === 'library' && account.表情包[name] === stickerReference(name))"
          @click="updateSelection([name], section === 'library')"
        >
          {{
            section === 'selected'
              ? '移除'
              : account.表情包[name] === stickerReference(name)
                ? '已选用'
                : account.表情包[name]
                  ? '替换同名表情'
                  : '选用'
          }}
        </button>
      </article>
    </div>
    <div v-else class="wx-manager-empty">
      <p>
        {{
          search || folder
            ? '没有匹配的表情，试试其他名称或分类。'
            : section === 'selected'
              ? '当前账号还没有表情。可以添加图片，或从共享表情中选用。'
              : '共享表情库为空，添加图片后可供其他账号选用。'
        }}
      </p>
      <button
        v-if="!search && !folder && section === 'selected' && library.length"
        type="button"
        @click="switchSection('library')"
      >
        去共享表情选用
      </button>
    </div>
    <div
      v-if="preview"
      class="wx-dialog-backdrop wx-sticker-preview"
      @click.self="preview = null"
      @keydown.esc="preview = null"
    >
      <section role="dialog" aria-modal="true" :aria-label="`预览 ${preview.name}`" class="wx-dialog">
        <button type="button" aria-label="关闭预览" autofocus @click="preview = null">关闭</button>
        <img v-if="resolveWechatImage(preview.url)" :src="resolveWechatImage(preview.url)" :alt="preview.name" />
        <p>{{ preview.name }}</p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { 微信数据 } from '../../types';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { chooseImageCrop } from '../../imageCrop';
import { readImageCategories } from './imageCategories';
import {
  addNamedSticker,
  imageIdFromUrl,
  readWechatImageFile,
  readWechatStickerLibrary,
  readStickerPreferences,
  setStickerPreference,
  refreshWechatImageLibrary,
  resolveWechatImage,
  stickerLibraryEntries,
  stickerReference,
} from './imageLibrary';
import WeChatImageLibrary from './WeChatImageLibrary.vue';

const props = defineProps<{
  accountId: string;
  accounts: 微信数据['账号'];
  initialImage?: string;
  initialAdding?: boolean;
}>();
const emit = defineEmits<{ dirty: [value: boolean]; busy: [value: boolean] }>();
const store = useMagicGirlStatStore();
refreshWechatImageLibrary();
const account = computed(() => props.accounts[props.accountId]);
const library = computed(() => stickerLibraryEntries());
const preferences = computed(() => readStickerPreferences());
const showArchived = ref(false);
const section = ref<'selected' | 'library'>('selected');
const search = ref('');
const folder = ref('');
const order = ref('favorites');
const categories = ref(readImageCategories());
const checked = ref<string[]>([]);
const adding = ref(!!props.initialAdding);
const picking = ref(false);
const cropUploads = ref(false);
const busy = ref(false);
const notice = ref('');
const error = ref('');
const progress = ref('');
const externalUrl = ref('');
const preview = ref<{ name: string; url: string } | null>(null);
type Draft = { id: number; name: string; url: string; imported: boolean; error: string };
const drafts = ref<Draft[]>([]);
let draftId = 0;
const visible = computed(() => {
  const sources = readWechatStickerLibrary();
  const entries = section.value === 'library' ? library.value : Object.entries(account.value.表情包);
  const results = entries.filter(([name, url]) => {
    if (section.value === 'library' && preferences.value.archived.includes(name) !== showArchived.value) return false;
    if (!name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())) return false;
    if (!folder.value) return true;
    const source = url.startsWith('sticker://') ? sources[url.slice('sticker://'.length)] : url;
    const placement = categories.value.placements[imageIdFromUrl(source || '')];
    if (folder.value === 'uncategorized') return !placement;
    const [groupId, folderId] = folder.value.split(':');
    return placement?.groupId === groupId && (!folderId || placement.folderId === folderId);
  });
  if (order.value === 'name') return results.sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));
  return order.value === 'favorites'
    ? results.sort(
        ([a], [b]) => Number(preferences.value.favorites.includes(b)) - Number(preferences.value.favorites.includes(a)),
      )
    : results;
});
watch([search, folder, order, section, showArchived], () => {
  checked.value = [];
});
watch(
  () => drafts.value.length > 0 || !!externalUrl.value,
  value => emit('dirty', value),
  { immediate: true },
);
watch(busy, value => emit('busy', value), { flush: 'sync' });

function favorite(name: string) {
  try {
    setStickerPreference([name], 'favorites', !preferences.value.favorites.includes(name));
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '常用设置失败。';
  }
}
function archiveChecked() {
  try {
    setStickerPreference(checked.value, 'archived', !showArchived.value);
    notice.value = showArchived.value
      ? '已恢复到共享表情库。'
      : '已归档，已有账号仍可使用，历史消息保留。勾选“查看已归档”可恢复。';
    checked.value = [];
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '归档失败。';
  }
}

function switchSection(next: 'selected' | 'library') {
  section.value = next;
}
function toggleAll() {
  checked.value = checked.value.length === visible.value.length ? [] : visible.value.map(([name]) => name);
}
function queueImage(url: string) {
  const existing = library.value.find(([, source]) => source === url);
  if (existing) {
    notice.value = `图片已有表情名称「${existing[0]}」，可直接选用。`;
    section.value = 'library';
    showArchived.value = preferences.value.archived.includes(existing[0]);
    search.value = existing[0];
    folder.value = '';
    picking.value = false;
    return;
  }
  drafts.value.push({ id: draftId++, name: '', url, imported: false, error: '' });
  picking.value = false;
  categories.value = readImageCategories();
}
function queueExternal() {
  if (!/^https?:\/\//.test(externalUrl.value.trim())) {
    error.value = '请填写 http 或 https 图片地址。';
    return;
  }
  queueImage(externalUrl.value.trim());
  externalUrl.value = '';
  error.value = '';
}
if (props.initialImage) {
  adding.value = true;
  queueImage(props.initialImage);
}
async function readFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  if (!files.length || busy.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  const failures: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      progress.value = `读取 ${index + 1} / ${files.length}`;
      try {
        const source = cropUploads.value ? await chooseImageCrop(file) : file;
        if (!source) {
          failures.push(`${file.name}：已取消裁剪`);
          continue;
        }
        const url = await readWechatImageFile(source);
        drafts.value.push({
          id: draftId++,
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 30),
          url,
          imported: false,
          error: '',
        });
      } catch (cause) {
        failures.push(`${file.name}：${cause instanceof Error ? cause.message : '读取失败'}`);
      }
    }
    if (failures.length) error.value = failures.join('；');
    notice.value = `读取完成：${files.length - failures.length} 张待添加，请检查名称。`;
  } finally {
    busy.value = false;
    progress.value = '';
    input.value = '';
  }
}
async function updateSelection(names: string[], selecting: boolean) {
  if (busy.value) return;
  const replacements = names.filter(
    name => selecting && account.value.表情包[name] && account.value.表情包[name] !== stickerReference(name),
  );
  if (
    replacements.length &&
    !window.confirm(
      `当前账号的 ${replacements.join('、')} 已有同名图片。替换后，此账号的同名历史消息也会显示共享库图片。继续？`,
    )
  )
    return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const current = account.value;
    const next = { ...current.表情包 };
    for (const name of names) {
      if (selecting) next[name] = stickerReference(name);
      else delete next[name];
    }
    await store.updateWeChatAccount(props.accountId, current.昵称, current.头像, next, current.好友);
    checked.value = [];
    notice.value = selecting
      ? `已为 ${current.昵称} 选用 ${names.length} 个表情。`
      : `已从 ${current.昵称} 移除 ${names.length} 个表情，共享库保留。`;
  } catch (cause) {
    error.value = `${cause instanceof Error ? cause.message : '保存失败'} 请检查当前表情状态后重试。`;
  } finally {
    busy.value = false;
  }
}
async function importDrafts() {
  if (busy.value || !drafts.value.length) return;
  error.value = '';
  notice.value = '';
  const names = new Set<string>();
  const sources = readWechatStickerLibrary();
  for (const draft of drafts.value) {
    draft.name = draft.name.trim();
    draft.error = '';
    if (!draft.name) draft.error = '请填写名称。';
    else if (
      draft.name.includes('<') ||
      draft.name.includes('>') ||
      ['__proto__', 'constructor', 'prototype'].includes(draft.name)
    )
      draft.error = '此名称不可用。';
    else if (names.has(draft.name)) draft.error = '待添加清单中名称重复。';
    else if (!draft.imported && (Object.hasOwn(sources, draft.name) || Object.hasOwn(account.value.表情包, draft.name)))
      draft.error = '名称已存在，请修改名称或从共享表情选用。';
    names.add(draft.name);
  }
  if (drafts.value.some(draft => draft.error)) {
    error.value = '请先修正待添加清单中的名称问题。';
    return;
  }
  busy.value = true;
  try {
    for (const draft of drafts.value) {
      if (draft.imported) continue;
      try {
        addNamedSticker(draft.name, draft.url);
        draft.imported = true;
      } catch (cause) {
        draft.error = cause instanceof Error ? cause.message : '加入共享库失败';
      }
    }
    const imported = drafts.value.filter(draft => draft.imported);
    if (imported.length) {
      const current = account.value;
      const next = { ...current.表情包 };
      for (const draft of imported) next[draft.name] = stickerReference(draft.name);
      await store.updateWeChatAccount(props.accountId, current.昵称, current.头像, next, current.好友);
      drafts.value = drafts.value.filter(draft => !draft.imported);
      notice.value = `已添加 ${imported.length} 个表情到 ${current.昵称}。`;
      section.value = 'selected';
      search.value = '';
      folder.value = '';
    }
    if (drafts.value.length) error.value = '部分表情未完成，已保留待添加条目，请修正后重试。';
    else adding.value = false;
  } catch (cause) {
    error.value = `表情已加入共享库，但账号保存未完成：${cause instanceof Error ? cause.message : '保存失败'}。待添加清单已保留，可重试账号保存。`;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.wx-sticker-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--wx-bg);
  padding: 8px 0;
  display: grid;
  gap: 10px;
}
.wx-sticker-toolbar .wx-manager-primary {
  justify-self: start;
}
.wx-sticker-toolbar .wx-manager-notice {
  margin: 0;
}
.wx-sticker-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.wx-sticker-filters input {
  flex: 1 1 100%;
}
.wx-sticker-filters select {
  flex: 1;
  min-width: 0;
}
.wx-sticker-batchbar,
.wx-sticker-import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.wx-sticker-batchbar span {
  flex: 1 1 100%;
  color: var(--wx-muted);
}
.wx-sticker-manager button {
  cursor: pointer;
}
.wx-sticker-manager button:disabled {
  opacity: 0.5;
  cursor: default;
}
.wx-sticker-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}
.wx-sticker-card {
  position: relative;
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--wx-line);
  border-radius: 12px;
  background: var(--wx-panel);
}
.wx-sticker-check {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 1;
  padding: 7px;
  background: var(--wx-panel);
  border-radius: 8px;
}
.wx-sticker-check input {
  width: 17px;
  height: 17px;
}
.wx-sticker-preview-button {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--wx-muted);
}
.wx-sticker-preview-button img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.wx-sticker-card strong {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.wx-sticker-card > button:not(.wx-sticker-preview-button),
.wx-sticker-batchbar button,
.wx-sticker-import-actions button {
  padding: 9px 6px;
  border: 1px solid var(--wx-line);
  border-radius: 8px;
  background: var(--wx-bg);
  color: var(--wx-text);
  font-size: 12px;
}
.wx-sticker-draft {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}
.wx-sticker-draft label,
.wx-sticker-draft small {
  display: block;
  font-size: 12px;
}
.wx-sticker-draft input {
  width: 100%;
  box-sizing: border-box;
}
.wx-sticker-preview {
  z-index: 30;
}
.wx-sticker-preview .wx-dialog {
  width: calc(100% - 32px);
  max-width: 460px;
  padding: 16px;
}
.wx-sticker-preview img {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  margin-top: 12px;
}
.wx-sticker-preview p {
  overflow-wrap: anywhere;
}
@media (max-width: 340px) {
  .wx-sticker-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
