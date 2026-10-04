<template>
  <section class="wx-account-page wx-stickers-page">
    <header class="wx-stickers-header">
      <button type="button" :disabled="busy" @click="organizing ? finishOrganizing() : emit('close')">
        {{ organizing ? '取消' : '‹ 返回' }}
      </button>
      <strong>{{
        organizing
          ? `已选 ${checked.length} 张`
          : archived
            ? '归档表情'
            : accountIdValue === 'user'
              ? '表情'
              : `${account?.昵称 || accountIdValue}的表情`
      }}</strong>
      <button type="button" :disabled="busy" @click="organizing ? toggleAll() : startOrganizing()">
        {{ organizing ? (checked.length === visible.length && visible.length ? '取消全选' : '全选') : '整理' }}
      </button>
    </header>
    <div class="wx-stickers-navigation">
      <nav v-if="!archived" aria-label="表情范围">
        <button type="button" :class="{ active: section === 'selected' }" @click="setSection('selected')">
          {{ accountIdValue === 'user' ? '我的表情' : '账号表情' }}</button
        ><button type="button" :class="{ active: section === 'library' }" @click="setSection('library')">
          全部表情
        </button>
      </nav>
      <button
        v-else
        class="wx-sticker-subtle"
        type="button"
        @click="
          archived = false;
          setSection('library');
        "
      >
        ‹ 返回全部表情
      </button>
      <div class="wx-stickers-search">
        <input v-model="search" type="search" aria-label="搜索表情" placeholder="搜索表情" /><button
          type="button"
          aria-label="更多表情选项"
          :disabled="busy || organizing"
          @click="more = true"
        >
          ⋯
        </button>
      </div>
      <button v-if="folder" class="wx-sticker-subtle" type="button" @click="folder = ''">已按文件夹筛选 · 清除</button>
      <p v-if="notice" class="wx-sticker-status" role="status">{{ notice }}</p>
      <p v-if="error" class="wx-sticker-error" role="alert">{{ error }}</p>
    </div>
    <div class="wx-stickers-content">
      <div v-if="visible.length" class="wx-stickers-grid">
        <button
          v-for="[name, url] in visible"
          :key="name"
          type="button"
          class="wx-stickers-tile"
          :class="{ checked: checked.includes(name) }"
          :aria-label="organizing ? `选择 ${name}` : `查看 ${name}`"
          :aria-pressed="organizing ? checked.includes(name) : undefined"
          :disabled="busy"
          @click="tapSticker(name, url)"
        >
          <img v-if="resolveWechatImage(url)" :src="resolveWechatImage(url)" :alt="name" loading="lazy" /><span
            v-else
            class="wx-sticker-missing"
            >图片不可用</span
          >
          <span class="wx-stickers-name">{{ name }}</span
          ><span v-if="organizing" class="wx-stickers-check" aria-hidden="true">{{
            checked.includes(name) ? '✓' : ''
          }}</span>
        </button>
      </div>
      <div v-else class="wx-stickers-empty">
        <p>{{ search ? '没有找到这个表情' : archived ? '没有归档的表情' : '还没有表情' }}</p>
        <button
          v-if="!search && !archived && section === 'selected' && library.length"
          type="button"
          @click="setSection('library')"
        >
          从全部表情中添加
        </button>
      </div>
    </div>
    <footer class="wx-stickers-footer">
      <template v-if="organizing"
        ><button
          v-if="!archived"
          class="wx-sticker-primary"
          type="button"
          :disabled="busy || !checked.length"
          @click="updateSelection(checked, section === 'library')"
        >
          {{ busy ? '保存中…' : section === 'selected' ? '移除所选' : '添加到当前账号' }}</button
        ><button
          v-if="section === 'library'"
          type="button"
          :disabled="busy || !checked.length"
          @click="archiveNames(checked, !archived)"
        >
          {{ archived ? '恢复所选' : '归档所选' }}
        </button></template
      >
      <button
        v-else-if="!archived"
        class="wx-sticker-primary"
        type="button"
        :disabled="!account"
        @click="importing = true"
      >
        ＋ 添加表情
      </button>
    </footer>
    <WeChatStickerImport
      v-if="importing && account"
      :account-id="accountIdValue"
      :accounts="accounts"
      :initial-image="initialImage"
      @saved="imported"
      @close="importing = false"
    />
    <WeChatStickerSheet v-if="detail" :label="detail.name" :busy="busy" @close="detail = null">
      <header class="wx-sticker-sheet-head">
        <strong>{{ detail.name }}</strong
        ><button type="button" :disabled="busy" @click="detail = null">关闭</button>
      </header>
      <div class="wx-sticker-sheet-body wx-sticker-detail">
        <img v-if="resolveWechatImage(detail.url)" :src="resolveWechatImage(detail.url)" :alt="detail.name" />
        <p v-if="error" class="wx-sticker-error" role="alert">{{ error }}</p>
        <button type="button" :disabled="busy" @click="favorite(detail.name)">
          {{ preferences.favorites.includes(detail.name) ? '★ 取消常用' : '☆ 设为常用' }}</button
        ><button
          v-if="
            !archived &&
            (!account?.表情包[detail.name] ||
              (section === 'library' &&
                isShared(detail.name) &&
                account.表情包[detail.name] !== stickerReference(detail.name)))
          "
          class="wx-sticker-primary"
          type="button"
          :disabled="busy || !account"
          @click="updateSelection([detail.name], true)"
        >
          {{ account?.表情包[detail.name] ? '替换当前同名表情' : '添加到当前账号' }}</button
        ><button v-else-if="!archived" type="button" :disabled="busy" @click="updateSelection([detail.name], false)">
          从当前账号移除</button
        ><button
          v-if="section === 'library' && library.some(([name]) => name === detail?.name)"
          type="button"
          :disabled="busy"
          @click="archiveNames([detail.name], !archived)"
        >
          {{ archived ? '恢复表情' : '归档表情' }}
        </button>
      </div>
    </WeChatStickerSheet>
    <WeChatStickerSheet v-if="more" label="更多表情选项" @close="more = false">
      <header class="wx-sticker-sheet-head">
        <strong>更多选项</strong><button type="button" @click="more = false">关闭</button>
      </header>
      <div class="wx-sticker-sheet-body wx-sticker-options">
        <button
          type="button"
          @click="
            archived = true;
            setSection('library');
            more = false;
          "
        >
          查看归档表情</button
        ><label
          >管理其他账号<select :value="accountIdValue" @change="changeAccount">
            <option v-for="[id, value] in Object.entries(accounts)" :key="id" :value="id">
              {{ value.昵称 || id }}（{{ id }}）
            </option>
          </select></label
        >
        <details>
          <summary>按图库文件夹筛选</summary>
          <select v-model="folder" aria-label="表情文件夹">
            <option value="">全部分类</option>
            <option value="uncategorized">未分类</option>
            <template v-for="group in categories.groups" :key="group.id"
              ><option :value="group.id">{{ group.name }}</option>
              <option v-for="child in group.folders" :key="child.id" :value="`${group.id}:${child.id}`">
                {{ group.name }} / {{ child.name }}
              </option></template
            ></select
          ><button type="button" @click="more = false">查看结果</button>
        </details>
        <button
          v-if="folder"
          type="button"
          @click="
            folder = '';
            more = false;
          "
        >
          清除分类筛选
        </button>
      </div>
    </WeChatStickerSheet>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { 微信数据 } from '../../types';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { readImageCategories } from './imageCategories';
import {
  imageIdFromUrl,
  readWechatStickerLibrary,
  readStickerPreferences,
  setStickerPreference,
  refreshWechatImageLibrary,
  resolveWechatImage,
  stickerLibraryEntries,
  stickerReference,
} from './imageLibrary';
import WeChatStickerImport from './WeChatStickerImport.vue';
import WeChatStickerSheet from './WeChatStickerSheet.vue';
import './stickers.css';

const props = withDefaults(defineProps<{ accountId?: string; accounts: 微信数据['账号']; initialImage?: string }>(), {
  accountId: 'user',
  initialImage: '',
});
const emit = defineEmits<{ close: [] }>();
const store = useMagicGirlStatStore();
refreshWechatImageLibrary();
const accountIdValue = ref(props.accountId);
const account = computed(() => props.accounts[accountIdValue.value]);
const library = computed(() => stickerLibraryEntries());
const preferences = computed(() => readStickerPreferences());
const section = ref<'selected' | 'library'>('selected');
const search = ref('');
const archived = ref(false);
const organizing = ref(false);
const more = ref(false);
const folder = ref('');
const categories = ref(readImageCategories());
const checked = ref<string[]>([]);
const importing = ref(!!props.initialImage);
const detail = ref<{ name: string; url: string } | null>(null);
const busy = ref(false);
const notice = ref('');
const error = ref('');
const visible = computed(() => {
  const own = Object.entries(account.value?.表情包 ?? {});
  const entries =
    section.value === 'selected'
      ? own
      : [...library.value, ...own.filter(([name]) => !library.value.some(([label]) => label === name))];
  const sources = readWechatStickerLibrary();
  return entries
    .filter(([name, url]) => {
      if (section.value === 'library' && preferences.value.archived.includes(name) !== archived.value) return false;
      if (!name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())) return false;
      if (!folder.value) return true;
      const source = url.startsWith('sticker://') ? sources[url.slice(10)] : url;
      const placement = categories.value.placements[imageIdFromUrl(source || '')];
      if (folder.value === 'uncategorized') return !placement;
      const [groupId, folderId] = folder.value.split(':');
      return placement?.groupId === groupId && (!folderId || placement.folderId === folderId);
    })
    .sort(
      ([a], [b]) => Number(preferences.value.favorites.includes(b)) - Number(preferences.value.favorites.includes(a)),
    );
});
watch(
  [search, section, folder, archived, accountIdValue],
  () => {
    checked.value = [];
    detail.value = null;
  },
  { flush: 'sync' },
);
function setSection(next: 'selected' | 'library') {
  if (busy.value) return;
  section.value = next;
  checked.value = [];
  error.value = '';
  notice.value = '';
}
function startOrganizing() {
  organizing.value = true;
  checked.value = [];
  notice.value = '';
}
function finishOrganizing() {
  if (busy.value) return;
  organizing.value = false;
  checked.value = [];
}
function toggleAll() {
  checked.value = checked.value.length === visible.value.length ? [] : visible.value.map(([name]) => name);
}
function tapSticker(name: string, url: string) {
  if (organizing.value)
    checked.value = checked.value.includes(name)
      ? checked.value.filter(label => label !== name)
      : [...checked.value, name];
  else {
    error.value = '';
    detail.value = { name, url };
  }
}
function changeAccount(event: Event) {
  accountIdValue.value = (event.target as HTMLSelectElement).value;
  archived.value = false;
  folder.value = '';
  search.value = '';
  setSection('selected');
  more.value = false;
  notice.value = '';
}
function imported() {
  notice.value = '表情已添加';
  search.value = '';
  folder.value = '';
  archived.value = false;
  setSection('selected');
  categories.value = readImageCategories();
}
function favorite(name: string) {
  try {
    setStickerPreference([name], 'favorites', !preferences.value.favorites.includes(name));
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '常用设置失败。';
  }
}
function isShared(name: string) {
  return library.value.some(([label]) => label === name);
}
function archiveNames(names: string[], enabled: boolean) {
  try {
    setStickerPreference(names, 'archived', enabled);
    notice.value = enabled ? '已归档，可从更多选项恢复；已有账号仍可使用。' : '已恢复';
    checked.value = [];
    detail.value = null;
    error.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '归档失败。';
  }
}
async function updateSelection(names: string[], selecting: boolean) {
  if (busy.value || !names.length) return;
  const current = account.value;
  if (!current) {
    error.value = '请先创建账号。';
    return;
  }
  const conflicts = names.filter(
    name => selecting && current.表情包[name] && current.表情包[name] !== stickerReference(name),
  );
  if (
    conflicts.length &&
    !window.confirm(`替换当前账号的 ${conflicts.join('、')}？该账号同名历史消息也会显示共享库图片。`)
  )
    return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const next = { ...current.表情包 };
    for (const name of names) {
      if (selecting) {
        if (isShared(name)) next[name] = stickerReference(name);
        else if (!current.表情包[name]) throw new Error('共享库中找不到所选表情。');
      } else delete next[name];
    }
    await store.updateWeChatAccount(accountIdValue.value, current.昵称, current.头像, next, current.好友);
    notice.value = selecting ? `已添加 ${names.length} 张` : `已移除 ${names.length} 张，图片仍保留`;
    checked.value = [];
    detail.value = null;
  } catch (cause) {
    error.value = `${cause instanceof Error ? cause.message : '保存失败'}，可再次保存重试。`;
  } finally {
    busy.value = false;
  }
}
</script>
