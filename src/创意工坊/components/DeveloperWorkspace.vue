<template>
  <section class="studio">
    <nav class="domains">
      <button :class="{ active: domain === '剧本' }" @click="pickDomain('剧本')">
        剧本 <small>{{ scenarios.length }}</small></button
      ><button :class="{ active: domain === '角色' }" @click="pickDomain('角色')">
        角色 <small>{{ roleGroups.length }}</small>
      </button>
    </nav>
    <aside class="catalog">
      <header>
        <h2>{{ domain }}</h2>
        <button class="primary" @click="createCurrent">+ 新建</button>
      </header>
      <input v-model="query" type="search" :placeholder="`搜索${domain}`" /><template v-if="domain === '角色'"
        ><select v-model="roleType">
          <option value="">全部类型</option>
          <option>user</option>
          <option>主要角色</option>
          <option>次要角色</option></select
        ><select v-model="scenarioFilter">
          <option value="">全部剧本引用</option>
          <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.title }}</option>
        </select>
        <div v-for="group in filteredRoleGroups" :key="group.identity" class="role-group">
          <button
            class="asset role-identity"
            :class="{ active: group.items.some(r => r.id === selectedId) }"
            @click="openRoleGroup(group)"
          >
            <RoleAvatar
              class="catalog-avatar"
              :src="group.items[0].entry.meta?.avatar"
              :alt="group.title"
              :seed="group.items[0].entry.key"
              :fallback-style="group.items[0].entry.meta?.avatarStyle"
            />
            <span class="asset-copy"
              ><strong :title="group.title">{{ group.title }}</strong
              ><span>{{ group.type }} · {{ group.items.length > 1 ? `${group.items.length} 个版本` : '单一版本' }}</span
              ><small :title="group.summary">{{ group.summary }}</small></span
            >
            <span v-if="group.items.length > 1" class="chevron" :class="{ open: expandedGroups.has(group.identity) }"
              >⌄</span
            >
          </button>
          <div v-if="group.items.length > 1 && expandedGroups.has(group.identity)" class="variant-drawer">
            <button
              v-for="r in group.items"
              :key="r.id"
              class="variant"
              :class="{ active: selectedId === r.id }"
              @click="selectedId = r.id"
            >
              <strong>{{ r.entry.author || '未署名版本' }}</strong
              ><span>{{ references(r.id).join('、') || '尚未加入剧本' }}</span
              ><small>{{ versionSummary(r.id) }}</small>
            </button>
          </div>
        </div></template
      ><template v-else
        ><button
          v-for="s in filteredScenarios"
          :key="s.id"
          class="asset"
          :class="{ active: selectedId === s.id }"
          @click="selectedId = s.id"
        >
          <strong>{{ s.title }}</strong
          ><span>{{ s.entry.可用 ? '可玩' : '编辑中' }}</span
          ><small>{{ s.entry.主题 || '未设主题' }}</small>
        </button></template
      >
    </aside>
    <main class="editing">
      <header v-if="entry">
        <div>
          <small>{{ domain }}</small>
          <h2>{{ title }}</h2>
        </div>
        <div>
          <button @click="copyCurrent">复制</button><button @click="exportOpen = true">导出</button
          ><button class="danger" @click="askDelete">删除</button>
        </div>
      </header>
      <template v-if="domain === '角色' && entry"
        ><details v-if="variants.length > 1" class="context">
          <summary>版本差异与剧本生效关系（{{ variants.length }}）</summary>
          <p>同一角色的多个版本可被不同剧本引用；同一剧本重复引用时，列表中靠后的版本生效。</p>
          <button v-for="v in variants" :key="v.id" @click="selectedId = v.id">
            <b>{{ v.entry.author || '未署名版本' }} · {{ references(v.id).join('、') || '未引用' }}</b
            ><span>{{ v.id === effective ? '当前筛选剧本使用' : '' }}</span
            ><small>{{ variantDiff(v.id) }}</small>
          </button>
        </details>
        <RoleEditor
          v-model:entry="entry"
          :role-options="roleOptions"
          @request-type-change="pendingRoleType = $event" /></template
      ><ScenarioEditor v-else-if="entry" :entry="entry" :source="draft" />
      <div v-else class="empty">选择或新建一项{{ domain }}</div>
    </main>
    <aside class="status">
      <h2>工作状态</h2>
      <p>{{ changes.length ? `${changes.length}项未保存` : '全部已保存' }}</p>
      <h3>自动装配</h3>
      <dl>
        <template v-for="c in shared" :key="c"
          ><dt>{{ c }}</dt>
          <dd>{{ Object.keys(draft.registries[c]).length }}项</dd></template
        >
      </dl>
      <p class="muted">地图使用唯一地图；共享资源不提供编辑或选择入口。</p>
      <h3>发布检查</h3>
      <button
        v-for="i in issues"
        :key="i.ownerId + i.field"
        class="issue"
        @click="
          domain = '剧本';
          selectedId = i.ownerId;
        "
      >
        {{ scenarioTitle(i.ownerId) }}<span>{{ i.field }}缺失</span>
      </button>
      <p v-if="!issues.length" class="pass">✓ 引用完整</p>
    </aside>
    <footer class="savebar">
      <span>{{ changes.length }}项未保存</span>
      <div>
        <button :disabled="!changes.length" @click="$emit('requestReload')">放弃草稿</button
        ><button class="primary" :disabled="!changes.length" @click="reviewOpen = true">审阅并保存</button>
      </div>
    </footer>
    <AppDialog :open="reviewOpen" title="审阅本次保存" @cancel="reviewOpen = false"
      ><details v-for="c in changes" :key="c.category + c.id" open>
        <summary>{{ c.category }}·{{ c.title }}</summary>
        <p v-for="f in c.fields" :key="f.path">
          <b>{{ f.path }}</b
          >：{{ format(f.oldValue) }} → {{ format(f.newValue) }}
        </p>
      </details>
      <template #actions
        ><button
          class="primary"
          @click="
            reviewOpen = false;
            $emit('save');
          "
        >
          确认保存
        </button></template
      ></AppDialog
    >
    <AppDialog :open="exportOpen" title="导出预览" @cancel="exportOpen = false"
      ><p>将导出{{ domain }}“{{ title }}”。</p>
      <template #actions><button class="primary" @click="confirmExport">下载</button></template></AppDialog
    ><AppDialog :open="deleteOpen" title="删除确认" @cancel="deleteOpen = false"
      ><p>{{ deleteImpacts.length ? `将清理${deleteImpacts.length}处剧本引用并禁用相关剧本。` : '该项未被引用。' }}</p>
      <template #actions><button class="danger" @click="confirmDelete">确认删除</button></template></AppDialog
    ><AppDialog :open="!!pendingRoleType" title="转换角色类型" @cancel="pendingRoleType = ''"
      ><p>将移除不适用字段：{{ removedFields.join('、') || '无' }}</p>
      <template #actions><button class="danger" @click="confirmRoleType">确认转换</button></template></AppDialog
    >
  </section>
</template>
<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */
import { klona } from 'klona';
import { computed, reactive, ref } from 'vue';
import { deleteAsset, findReferenceIssues, findReferencesTo } from '../assets/model';
import { createPackage, downloadPackage } from '../assets/package';
import { assetTitle, createDefaultAsset, defaultRoleData, diffSources } from '../assets/presentation';
import type { ReferenceIssue, ScenarioSourceBundle } from '../scenario/types';
import AppDialog from './AppDialog.vue';
import RoleEditor from './RoleEditor.vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import ScenarioEditor from './ScenarioEditor.vue';
const props = defineProps<{ source: ScenarioSourceBundle; draft: ScenarioSourceBundle }>();
defineEmits<{ save: []; requestReload: [] }>();
const domain = ref<'角色' | '剧本'>('剧本'),
  selectedId = ref(''),
  query = ref(''),
  roleType = ref(''),
  scenarioFilter = ref(''),
  reviewOpen = ref(false),
  exportOpen = ref(false),
  deleteOpen = ref(false),
  deleteImpacts = ref<ReferenceIssue[]>([]),
  pendingRoleType = ref(''),
  expandedGroups = reactive(new Set<string>());
const shared = ['地图', '世界经济', '季节与节日', '势力', '种族'] as const;
const changes = computed(() => diffSources(props.source, props.draft)),
  issues = computed(() => findReferenceIssues(props.draft));
const scenarios = computed(() =>
  Object.entries(props.draft.scenarios).map(([id, entry]) => ({ id, entry, title: assetTitle('开场白', entry) })),
);
const roles = computed(() => {
  const all = Object.entries(props.draft.registries.角色);
  return all.map(([id, entry]) => {
    const refs = references(id),
      tags = [entry.author, ...arr(entry.data?.区域检索词), ...refs].filter(Boolean);
    return {
      id,
      entry,
      title: assetTitle('角色', entry),
      tags,
      terms: [entry.type, entry.key, entry.author, ...arr(entry.data?.名称检索词), ...tags].join(' ').toLowerCase(),
    };
  });
});
const roleGroups = computed(() => {
  const groups = new Map<string, typeof roles.value>();
  for (const role of roles.value) {
    const identity = `${role.entry.type}\u0000${role.entry.key}`;
    groups.set(identity, [...(groups.get(identity) ?? []), role]);
  }
  return [...groups.entries()].map(([identity, items]) => {
    const refs = [...new Set(items.flatMap(item => references(item.id)))];
    const authors = [...new Set(items.map(item => item.entry.author).filter(Boolean))];
    return {
      identity,
      items,
      title: items[0].title,
      type: items[0].entry.type,
      summary: refs.join('、') || authors.join('、') || '尚未加入剧本',
    };
  });
});
const roleOptions = computed(() => [...new Set(roles.value.map(role => role.title))]);
const filteredRoleGroups = computed(() =>
  roleGroups.value.filter(
    group =>
      (!roleType.value || group.type === roleType.value) &&
      (!scenarioFilter.value ||
        group.items.some(r => props.draft.scenarios[scenarioFilter.value]?.内容配置.角色.includes(r.id))) &&
      group.items.some(r => r.terms.includes(query.value.toLowerCase())),
  ),
);
const filteredScenarios = computed(() =>
  scenarios.value.filter(s =>
    `${s.title} ${s.entry.desc} ${s.entry.主题}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
const entry = computed<any>(() =>
  domain.value === '角色' ? props.draft.registries.角色[selectedId.value] : props.draft.scenarios[selectedId.value],
);
const title = computed(() => (entry.value ? assetTitle(domain.value === '角色' ? '角色' : '开场白', entry.value) : ''));
const variants = computed(() =>
  entry.value && domain.value === '角色'
    ? roles.value.filter(r => r.entry.type === entry.value.type && r.entry.key === entry.value.key)
    : [],
);
const effective = computed(
  () =>
    [...(props.draft.scenarios[scenarioFilter.value]?.内容配置.角色 ?? [])]
      .reverse()
      .find(id => variants.value.some(v => v.id === id)) ?? '',
);
const removedFields = computed(() =>
  entry.value && pendingRoleType.value
    ? Object.keys(entry.value.data).filter(k => !(k in defaultRoleData(pendingRoleType.value)))
    : [],
);
function arr(v: unknown) {
  return Array.isArray(v) ? v.map(String) : [];
}
function references(id: string) {
  return scenarios.value.filter(s => s.entry.内容配置.角色.includes(id)).map(s => s.title);
}
function openRoleGroup(group: (typeof roleGroups.value)[number]) {
  if (group.items.length === 1) {
    selectedId.value = group.items[0].id;
    return;
  }
  if (expandedGroups.has(group.identity)) expandedGroups.delete(group.identity);
  else expandedGroups.add(group.identity);
}
function versionSummary(id: string) {
  const current = props.draft.registries.角色[id];
  const peers = roles.value.filter(r => r.id !== id && r.entry.type === current.type && r.entry.key === current.key);
  const fields = new Set<string>();
  for (const peer of peers) {
    for (const key of [...Object.keys(current.data as object), ...Object.keys(peer.entry.data as object)]) {
      if (JSON.stringify((current.data as any)[key]) !== JSON.stringify((peer.entry.data as any)[key])) fields.add(key);
    }
  }
  return fields.size ? `区别：${[...fields].slice(0, 3).join('、')}` : current.desc || '内容相同';
}
function scenarioTitle(id: string) {
  return assetTitle('开场白', props.draft.scenarios[id]);
}
function pickDomain(v: '角色' | '剧本') {
  domain.value = v;
  selectedId.value = '';
  query.value = '';
}
function variantDiff(id: string) {
  const other = props.draft.registries.角色[id];
  if (other === entry.value) return '当前变体';
  const keys = [...new Set([...Object.keys(entry.value?.data ?? {}), ...Object.keys(other?.data ?? {})])].filter(
    k => JSON.stringify(entry.value.data[k]) !== JSON.stringify(other.data[k]),
  );
  return keys.length ? `差异：${keys.slice(0, 5).join('、')}` : '内容相同';
}
function createCurrent() {
  const id = crypto.randomUUID();
  if (domain.value === '角色') props.draft.registries.角色[id] = createDefaultAsset('角色');
  else createScenario(id);
  selectedId.value = id;
}
function createScenario(id: string) {
  const s = createDefaultAsset('开场白');
  for (const c of ['世界', '开场文本', '主线'] as const) {
    const aid = crypto.randomUUID();
    props.draft.registries[c][aid] = createDefaultAsset(c) as never;
    s.内容配置[c] = aid;
  }
  for (const c of ['任务', '事件'] as const) {
    const aid = crypto.randomUUID();
    props.draft.registries[c][aid] = createDefaultAsset(c) as never;
    s.内容配置[c] = [aid];
  }
  props.draft.scenarios[id] = s;
}
function copyCurrent() {
  if (!entry.value) return;
  const id = crypto.randomUUID(),
    v = klona(entry.value);
  v.key = `${v.key || title.value}副本`;
  if (domain.value === '角色') props.draft.registries.角色[id] = v;
  else {
    v.可用 = false;
    props.draft.scenarios[id] = v;
  }
  selectedId.value = id;
}
function askDelete() {
  deleteImpacts.value = domain.value === '角色' ? findReferencesTo(props.draft, '角色', selectedId.value) : [];
  deleteOpen.value = true;
}
function confirmDelete() {
  if (domain.value === '角色') deleteAsset(props.draft, '角色', selectedId.value, true);
  else delete props.draft.scenarios[selectedId.value];
  selectedId.value = '';
  deleteOpen.value = false;
}
function confirmExport() {
  const c = domain.value === '角色' ? '角色' : '开场白';
  downloadPackage(createPackage(props.draft, { [c]: [selectedId.value] }), title.value);
  exportOpen.value = false;
}
function confirmRoleType() {
  const next = defaultRoleData(pendingRoleType.value);
  for (const k of Object.keys(next)) if (k in entry.value.data) next[k] = klona(entry.value.data[k]);
  entry.value.data = next;
  entry.value.type = pendingRoleType.value;
  pendingRoleType.value = '';
}
function format(v: unknown) {
  if (v === undefined) return '未设置';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
}
</script>
<style scoped>
.studio {
  display: grid;
  grid-template-areas: 'domains catalog editing' 'domains catalog status';
  grid-template-columns: 112px 300px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 1px;
  margin-top: 16px;
  height: calc(100vh - 142px);
  background: #393d3f;
}
.domains {
  grid-area: domains;
}
.catalog {
  grid-area: catalog;
  overflow: auto;
}
.editing {
  grid-area: editing;
}
.status {
  grid-area: status;
  display: grid;
  grid-template-columns: auto minmax(220px, 1fr) minmax(260px, 1fr);
  gap: 16px;
  align-items: start;
  border-top: 1px solid #393d3f;
}
.domains,
.catalog,
.editing,
.status {
  min-width: 0;
  padding: 16px;
  background: #15181a;
}
.domains,
.catalog {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.domains button,
.catalog header,
.editing > header,
.savebar,
.savebar div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.domains button.active,
.asset.active {
  outline: 2px solid #cbb477;
}
.asset {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  text-align: left;
}
.role-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.role-identity {
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
}
.asset-copy strong,
.asset-copy span,
.asset-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chevron {
  color: #cbb477 !important;
  font-size: 20px;
  transition: transform 0.18s ease;
}
.chevron.open {
  transform: rotate(180deg);
}
.variant-drawer {
  display: grid;
  gap: 3px;
  margin: 0 0 5px 20px;
  padding-left: 11px;
  border-left: 1px solid #756744;
}
.variant {
  display: block !important;
  width: 100%;
  min-width: 0;
  text-align: left;
}
.variant > * {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.variant span,
.variant small {
  color: #b8b09f;
}
.asset-copy,
.asset-copy strong,
.asset-copy span,
.asset small,
.issue span,
.context button > * {
  display: block;
}
.catalog-avatar {
  --avatar-size: 38px;
}
.asset-copy {
  min-width: 0;
}
.asset span,
.asset small,
.muted {
  color: #b8b09f;
}
.editing {
  max-height: none;
  overflow: auto;
}
.editing > header {
  position: sticky;
  top: -16px;
  z-index: 3;
  margin: -16px -16px 12px;
  padding: 16px;
  background: #15181a;
}
.status dl {
  display: grid;
  grid-template-columns: 1fr auto;
}
.status dd {
  margin: 0;
}
.context {
  padding: 12px;
  background: #27241d;
  border-left: 3px solid #cbb477;
}
.context summary {
  cursor: pointer;
  color: #e6d39c;
  font-weight: 700;
}
.context button {
  width: 100%;
  text-align: left;
}
.savebar {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px 22px;
  background: #0d0f10;
  border-top: 1px solid #4c4f50;
}
.pass {
  color: #72b58a;
}
.danger {
  color: #f1c2bc !important;
  border-color: #d47569 !important;
}
.empty {
  padding: 40px;
  text-align: center;
}
@media (max-width: 1100px) {
  .studio {
    grid-template-areas: 'domains catalog editing' 'domains catalog status';
    grid-template-columns: 96px 250px minmax(0, 1fr);
  }
  .status {
    grid-template-columns: 1fr 1fr;
  }
  .status > h2 {
    grid-column: 1 / -1;
  }
}
@media (max-width: 720px) {
  .studio {
    display: block;
    height: auto;
  }
  .domains {
    flex-direction: row;
  }
  .editing {
    max-height: none;
  }
  .status {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
