<template>
  <section class="studio">
    <nav class="domains">
      <button :class="{ active: domain === '角色' }" @click="pickDomain('角色')">
        角色 <small>{{ roles.length }}</small></button
      ><button :class="{ active: domain === '剧本' }" @click="pickDomain('剧本')">
        剧本 <small>{{ scenarios.length }}</small>
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
          <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.title }}</option></select
        ><button
          v-for="r in filteredRoles"
          :key="r.id"
          class="asset"
          :class="{ active: selectedId === r.id }"
          @click="selectedId = r.id"
        >
          <RoleAvatar class="catalog-avatar" :src="r.entry.meta?.avatar" :alt="r.title" />
          <span class="asset-copy"><strong>{{ r.title }}</strong><span>{{ r.entry.type }} · {{ r.variantCount }}个变体</span><small>{{ references(r.id).join(' · ') || '尚未加入剧本' }}</small></span>
        </button></template
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
        ><section v-if="variants.length > 1" class="context">
          <h3>同 type + key 变体</h3>
          <p>剧本中后引用的变体整体覆盖前者。</p>
          <button v-for="v in variants" :key="v.id" @click="selectedId = v.id">
            <b>{{ references(v.id).join('、') || '未引用' }}</b
            ><span>{{ v.id === effective ? '· 当前筛选剧本生效' : '' }}</span
            ><small>{{ variantDiff(v.id) }}</small>
          </button>
        </section>
        <RoleEditor v-model:entry="entry" @request-type-change="pendingRoleType = $event" /></template
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
import { computed, ref } from 'vue';
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
const domain = ref<'角色' | '剧本'>('角色'),
  selectedId = ref(''),
  query = ref(''),
  roleType = ref(''),
  scenarioFilter = ref(''),
  reviewOpen = ref(false),
  exportOpen = ref(false),
  deleteOpen = ref(false),
  deleteImpacts = ref<ReferenceIssue[]>([]),
  pendingRoleType = ref('');
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
      variantCount: all.filter(([, v]) => v.type === entry.type && v.key === entry.key).length,
    };
  });
});
const filteredRoles = computed(() =>
  roles.value.filter(
    r =>
      (!roleType.value || r.entry.type === roleType.value) &&
      (!scenarioFilter.value || props.draft.scenarios[scenarioFilter.value]?.内容配置.角色.includes(r.id)) &&
      r.terms.includes(query.value.toLowerCase()),
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
.domains { grid-area: domains; }
.catalog { grid-area: catalog; overflow: auto; }
.editing { grid-area: editing; }
.status { grid-area: status; display: grid; grid-template-columns: auto minmax(220px, 1fr) minmax(260px, 1fr); gap: 16px; align-items: start; border-top: 1px solid #393d3f; }
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
.asset-copy,
.asset-copy strong,
.asset-copy span,
.asset small,
.issue span,
.context button > * {
  display: block;
}
.catalog-avatar { --avatar-size: 38px; }
.asset-copy { min-width: 0; }
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
  .status { grid-template-columns: 1fr 1fr; }
  .status > h2 { grid-column: 1 / -1; }
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
  .status { display: grid; grid-template-columns: 1fr; }
}
</style>
