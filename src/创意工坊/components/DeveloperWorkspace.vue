<template>
  <section class="studio" :class="`mobile-${mobilePane}`">
    <nav class="domains mobile-catalog">
      <button :class="{ active: domain === '剧本' }" @click="pickDomain('剧本')">
        剧本 <small>{{ scenarios.length }}</small></button
      ><button :class="{ active: domain === '角色' }" @click="pickDomain('角色')">
        角色 <small>{{ roleGroups.length }}</small>
      </button>
    </nav>
    <aside class="catalog mobile-catalog">
      <header>
        <h2>{{ domain }}</h2>
        <div class="catalog-actions">
          <button v-if="domain === '角色'" @click="openRoleAssistant()">✦ AI 新建</button
          ><button class="primary" @click="createCurrent">+ 新建</button>
        </div>
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
              :theme-color="group.items[0].entry.meta?.color"
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
              @click="selectAsset(r.id)"
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
          class="asset scenario-asset"
          :class="{ active: selectedId === s.id }"
          @click="selectAsset(s.id)"
        >
          <span class="scenario-asset-icon" aria-hidden="true"
            ><ScenarioThemeIcon :theme-id="s.entry.视觉方案" />
            <span class="scenario-availability" :class="{ ready: s.entry.可用 }">
              <svg viewBox="0 0 24 24">
                <path v-if="s.entry.可用" d="M5 12l4 4L19 6" />
                <path v-else d="M12 7v6M12 17v.01" />
                <circle cx="12" cy="12" r="9" />
              </svg> </span
          ></span>
          <span class="asset-copy"
            ><strong :title="s.title">{{ s.title }}</strong
            ><small :title="s.entry.desc || undefined">{{ s.entry.desc || '暂无剧本简介' }}</small></span
          ><span class="scenario-state-label">{{ s.entry.可用 ? '可玩' : '编辑中' }}</span>
        </button></template
      >
    </aside>
    <main class="editing mobile-editor">
      <button class="mobile-back" @click="mobilePane = 'catalog'">‹ 返回资源</button>
      <header v-if="entry">
        <div>
          <small>{{ domain }}</small>
          <h2>{{ title }}</h2>
        </div>
        <div>
          <button v-if="domain === '角色'" @click="openRoleAssistant(selectedId)">✦ AI 修改</button
          ><button @click="copyCurrent">复制</button><button @click="exportOpen = true">导出</button
          ><button class="danger" @click="askDelete">删除</button>
        </div>
      </header>
      <template v-if="domain === '角色' && entry"
        ><RoleEditor
          :key="selectedId"
          v-model:entry="entry"
          :role-options="roleOptions"
          :dirty-sections="roleDirtySections"
          @request-type-change="pendingRoleType = $event" /></template
      ><ScenarioEditor v-else-if="entry" :entry="entry" :source="draft" />
      <div v-else class="empty">选择或新建一项{{ domain }}</div>
    </main>
    <aside class="status mobile-status">
      <header class="status-summary">
        <div class="status-heading">
          <h2>草稿与检查</h2>
          <p v-if="domain === '角色' && entry">当前：{{ title }} · {{ entry.author || '未署名版本' }}</p>
          <p v-else-if="entry">当前：{{ title }}</p>
          <p v-else>选择资源后可查看检查详情</p>
        </div>
        <div class="status-badges">
          <span :class="{ warning: changes.length }">{{
            changes.length ? `${changes.length}项未保存` : '已保存'
          }}</span>
          <span :class="issues.length ? 'error' : 'pass'">{{
            issues.length ? `${issues.length}项引用问题` : '引用完整'
          }}</span>
        </div>
        <button
          class="status-toggle"
          type="button"
          :aria-expanded="statusExpanded"
          @click="statusExpanded = !statusExpanded"
        >
          {{ statusExpanded ? '收起详情' : '展开详情' }}
        </button>
      </header>
      <div v-show="statusExpanded || mobilePane === 'status'" class="status-details">
        <section v-if="domain === '角色' && entry" class="selected-role">
          <h3>当前角色</h3>
          <div>
            <RoleAvatar
              class="selected-avatar"
              :src="entry.meta?.avatar"
              :alt="title"
              :seed="entry.key"
              :fallback-style="entry.meta?.avatarStyle"
              :theme-color="entry.meta?.color"
            />
            <p>
              <b>{{ title }}</b
              ><span>{{ entry.type }} · {{ entry.author || '未署名版本' }}</span
              ><small>{{ references(selectedId).join('、') || '尚未加入剧本' }}</small>
            </p>
          </div>
          <label v-if="variants.length > 1"
            >具体版本<select v-model="selectedId">
              <option v-for="v in variants" :key="v.id" :value="v.id">
                {{ v.entry.author || '未署名版本' }} · {{ references(v.id).join('、') || '未引用' }}
              </option>
            </select></label
          >
          <p v-if="scenarioFilter" class="effective-role">
            {{ effective === selectedId ? '当前筛选剧本正在使用这个版本' : '当前筛选剧本未使用这个版本' }}
          </p>
        </section>
        <section class="status-section">
          <h3>需要处理</h3>
          <button
            v-for="i in issues"
            :key="i.ownerId + i.field"
            class="issue"
            @click="
              domain = '剧本';
              selectAsset(i.ownerId);
            "
          >
            {{ scenarioTitle(i.ownerId) }}<span>{{ i.field }}缺失</span>
          </button>
          <p v-if="!issues.length" class="pass">✓ 引用完整</p>
        </section>
      </div>
    </aside>
    <nav class="mobile-nav" aria-label="移动工作区导航">
      <button :class="{ active: mobilePane === 'catalog' }" @click="mobilePane = 'catalog'">资源</button>
      <button :class="{ active: mobilePane === 'editor' }" :disabled="!entry" @click="mobilePane = 'editor'">
        编辑
      </button>
      <button :class="{ active: mobilePane === 'status' }" @click="mobilePane = 'status'">检查</button>
    </nav>
    <footer class="savebar">
      <span>{{ changes.length }} 个资产有更改</span>
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
    <AppDialog
      :open="generatorOpen"
      :title="generatorTargetId ? '使用外部 AI 修改角色' : '使用外部 AI 新建角色'"
      @cancel="closeGenerator"
    >
      <div class="generator-form">
        <label
          >角色类型<select v-model="generatorType" :disabled="!!generatorTargetId">
            <option>user</option>
            <option>主要角色</option>
            <option>次要角色</option>
          </select></label
        >
        <label
          >{{ generatorTargetId ? '修改要求' : '角色创意'
          }}<textarea
            v-model="generatorIdea"
            rows="6"
            :placeholder="
              generatorTargetId ? '说明希望 AI 修改、补充或重写的内容……' : '身份、经历、性格、外貌、与世界的联系……'
            "
          />
        </label>
        <label
          >提升词（可选）<textarea v-model="generatorEnhancement" rows="3" placeholder="强调的写作方向或额外限制" />
        </label>
        <p class="muted">
          下载的提示词包含世界书规则、stat_data 角色模板<span v-if="generatorTargetId">和当前角色 JSON</span>。在网页 AI
          中提交后，将返回的完整 JSON 粘贴到下方{{ generatorTargetId ? '覆盖更新' : '导入' }}。
        </p>
        <label
          >角色 JSON<textarea
            v-model="generatorJson"
            rows="9"
            placeholder="粘贴网页 AI 返回的 JSON；可包含 ```json 代码围栏"
          />
        </label>
        <p v-if="generatorError" class="generator-error" role="alert">{{ generatorError }}</p>
      </div>
      <template #actions
        ><button v-if="generatorTargetId" @click="downloadCurrentRoleJson">导出角色 JSON</button
        ><button :disabled="preparingPrompt || !generatorIdea.trim()" @click="downloadGeneratorPrompt">
          {{ preparingPrompt ? '正在拼装…' : '下载提示词' }}</button
        ><button class="primary" :disabled="!generatorJson.trim()" @click="importGeneratedJson">
          {{ generatorTargetId ? '完整覆盖角色' : '导入新角色' }}
        </button></template
      >
    </AppDialog>
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
import {
  buildDownloadableRolePrompt,
  parseGeneratedRole,
  parseRoleRuntimeJson,
  roleToRuntimeJson,
  type GeneratedRoleType,
} from '../assets/roleGenerator';
import type { ReferenceIssue, ScenarioSourceBundle } from '../scenario/types';
import AppDialog from './AppDialog.vue';
import RoleEditor from './RoleEditor.vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import ScenarioEditor from './ScenarioEditor.vue';
import ScenarioThemeIcon from '../../尘史使徒/UI/components/scenario/ScenarioThemeIcon.vue';
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
  mobilePane = ref<'catalog' | 'editor' | 'status'>('catalog'),
  statusExpanded = ref(false),
  generatorOpen = ref(false),
  generatorTargetId = ref(''),
  generatorType = ref<GeneratedRoleType>('主要角色'),
  generatorIdea = ref(''),
  generatorEnhancement = ref(''),
  generatorJson = ref(''),
  generatorError = ref(''),
  preparingPrompt = ref(false),
  expandedGroups = reactive(new Set<string>());
const changes = computed(() => diffSources(props.source, props.draft)),
  issues = computed(() => findReferenceIssues(props.draft));
const roleDirtySections = computed(() => {
  if (domain.value !== '角色' || !selectedId.value) return [];
  const change = changes.value.find(item => item.category === '角色' && item.id === selectedId.value);
  if (change?.kind === 'added') return ['basic', 'personality', 'skills', 'items'];
  const fields = change?.fields ?? [];
  const sections = new Set<string>();
  for (const { path } of fields) {
    if (/^data\.(性格|人际关系|性经验)/.test(path)) sections.add('personality');
    else if (/^data\.(基础数值|生命状态|技能|术之等级)/.test(path)) sections.add('skills');
    else if (/^data\.(特殊状态|物品|金钱|缥缈异质)/.test(path)) sections.add('items');
    else sections.add('basic');
  }
  return [...sections];
});
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
const roleOptions = computed(() => {
  const options = new Map<string, { id: string; label: string; identity: string }>();
  for (const role of roles.value) {
    const identity = role.entry.type === 'user' ? 'user' : `${role.entry.type}\u0000${role.entry.key}`;
    if (!options.has(identity))
      options.set(identity, { id: role.entry.type === 'user' ? 'user' : role.entry.key, label: role.title, identity });
  }
  return [...options.values()];
});
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
    `${s.title} ${s.entry.desc} ${s.entry.视觉方案}`.toLowerCase().includes(query.value.toLowerCase()),
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
    selectAsset(group.items[0].id);
    return;
  }
  if (expandedGroups.has(group.identity)) expandedGroups.delete(group.identity);
  else expandedGroups.add(group.identity);
}
function selectAsset(id: string) {
  selectedId.value = id;
  mobilePane.value = 'editor';
}
function versionSummary(id: string) {
  const current = props.draft.registries.角色[id];
  return current.desc?.trim() || '暂无素材说明';
}
function scenarioTitle(id: string) {
  return assetTitle('开场白', props.draft.scenarios[id]);
}
function pickDomain(v: '角色' | '剧本') {
  domain.value = v;
  selectedId.value = '';
  mobilePane.value = 'catalog';
  query.value = '';
}
function createCurrent() {
  const id = crypto.randomUUID();
  if (domain.value === '角色') props.draft.registries.角色[id] = createDefaultAsset('角色');
  else createScenario(id);
  selectedId.value = id;
  mobilePane.value = 'editor';
}
function closeGenerator() {
  if (preparingPrompt.value) return;
  generatorOpen.value = false;
  generatorError.value = '';
}
function openRoleAssistant(targetId = '') {
  generatorTargetId.value = targetId;
  const target = props.draft.registries.角色[targetId];
  if (target) generatorType.value = target.type as GeneratedRoleType;
  generatorIdea.value = '';
  generatorEnhancement.value = '';
  generatorJson.value = '';
  generatorError.value = '';
  generatorOpen.value = true;
}
function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
async function downloadGeneratorPrompt() {
  preparingPrompt.value = true;
  generatorError.value = '';
  try {
    const target = props.draft.registries.角色[generatorTargetId.value];
    const prompt = await buildDownloadableRolePrompt(
      generatorType.value,
      generatorIdea.value,
      generatorEnhancement.value,
      props.draft,
      target ? roleToRuntimeJson(target) : undefined,
    );
    downloadText(prompt, `尘史角色提示词-${generatorType.value}.txt`);
  } catch (error) {
    generatorError.value = error instanceof Error ? error.message : String(error);
  } finally {
    preparingPrompt.value = false;
  }
}
function downloadCurrentRoleJson() {
  const target = props.draft.registries.角色[generatorTargetId.value];
  if (!target) return;
  downloadText(JSON.stringify(roleToRuntimeJson(target), null, 2), `${target.key || '角色'}-stat_data.json`);
}
function importGeneratedJson() {
  generatorError.value = '';
  try {
    const target = props.draft.registries.角色[generatorTargetId.value];
    let id = generatorTargetId.value;
    if (target) {
      const parsed = parseRoleRuntimeJson(generatorJson.value, generatorType.value);
      target.data = parsed.data;
      target.meta = { ...parsed.meta, avatarStyle: target.meta?.avatarStyle ?? 'auto' };
    } else {
      id = crypto.randomUUID();
      props.draft.registries.角色[id] = parseGeneratedRole(generatorJson.value, generatorType.value);
    }
    domain.value = '角色';
    selectedId.value = id;
    mobilePane.value = 'editor';
    generatorOpen.value = false;
    generatorIdea.value = '';
    generatorEnhancement.value = '';
    generatorJson.value = '';
    generatorTargetId.value = '';
  } catch (error) {
    generatorError.value = error instanceof Error ? error.message : String(error);
  }
}
function createScenario(id: string) {
  const s = createDefaultAsset('开场白');
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
  if (pendingRoleType.value === 'user') entry.value.key = 'user';
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
  grid-template-areas: 'domains catalog editing' 'domains catalog status' 'save save save';
  grid-template-columns: 112px 300px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto auto;
  gap: 1px;
  margin-top: 16px;
  height: auto;
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
.scenario-asset {
  grid-template-columns: 42px minmax(0, 1fr);
  width: 100%;
  min-height: 70px;
  overflow: hidden;
  position: relative;
}
.scenario-asset > * {
  position: relative;
  z-index: 1;
}
.scenario-asset-icon {
  position: relative;
  display: grid !important;
  width: 38px;
  height: 38px;
  place-items: center;
}
.scenario-availability {
  position: absolute !important;
  right: -5px;
  bottom: -4px;
  display: grid !important;
  width: 18px;
  height: 18px;
  padding: 2px;
  box-sizing: border-box;
  place-items: center;
  color: #ce896b !important;
  background: #15181a;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.scenario-availability.ready {
  color: #7db38a !important;
}
.scenario-availability svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.scenario-state-label {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
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
.selected-role p > * {
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
.status-summary {
  display: flex;
  gap: 16px;
  align-items: center;
}
.status-heading {
  min-width: 0;
  margin-right: auto;
}
.status-heading h2,
.status-heading p {
  margin: 0;
}
.status-heading h2 {
  font-size: 16px;
}
.status-heading p {
  overflow: hidden;
  margin-top: 3px;
  color: #b8b09f;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-badges {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}
.status-badges span {
  padding: 4px 8px;
  background: #202426;
  border: 1px solid #454a4c;
}
.status-badges .warning {
  color: #e0c778;
  border-color: #756744;
}
.status-badges .error {
  color: #f1c2bc;
  border-color: #8a4b44;
}
.status-toggle {
  flex: 0 0 auto;
}
.status-details {
  display: grid;
  grid-template-columns: minmax(260px, 1.25fr) minmax(190px, 0.8fr) minmax(230px, 1fr);
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #393d3f;
}
.status-section h3 {
  margin-top: 0;
}
.status dl {
  display: grid;
  grid-template-columns: 1fr auto;
}
.status dd {
  margin: 0;
}
.selected-role {
  padding: 12px;
  background: #20231f;
  border-left: 3px solid #cbb477;
}
.selected-role h3 {
  margin: 0 0 10px;
}
.selected-role > div {
  display: flex;
  gap: 10px;
  align-items: center;
}
.selected-role p {
  display: grid;
  gap: 2px;
  margin: 0;
}
.selected-role p span,
.selected-role p small {
  color: #b8b09f;
}
.selected-role label {
  display: grid;
  gap: 5px;
  margin-top: 10px;
}
.selected-avatar {
  --avatar-size: 48px;
}
.effective-role {
  margin: 8px 0 0 !important;
  color: #d8c38b;
}
.savebar {
  grid-area: save;
  position: static;
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
.mobile-nav,
.mobile-back {
  display: none !important;
}
.generator-form,
.generator-form label {
  display: grid;
  gap: 7px;
}
.generator-error {
  margin: 0;
  padding: 10px 12px;
  color: #f1c2bc;
  background: rgba(121, 43, 36, 0.28);
  border-left: 3px solid #d47569;
}
@media (max-width: 1100px) {
  .studio {
    grid-template-areas: 'domains catalog editing' 'domains catalog status' 'save save save';
    grid-template-columns: 96px 250px minmax(0, 1fr);
  }
  .status-details {
    grid-template-columns: 1fr 1fr;
  }
  .selected-role {
    grid-column: 1 / -1;
  }
}
@media (max-width: 720px) {
  .studio {
    display: grid;
    grid-template-areas: 'pane' 'save' 'nav';
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto auto;
    height: 100%;
    min-height: 0;
    margin-top: 8px;
    background: #15181a;
  }
  .studio > .domains,
  .studio > .catalog,
  .studio > .editing,
  .studio > .status {
    display: none;
    grid-area: pane;
    min-height: 0;
    overflow: auto;
    padding-bottom: 24px;
  }
  .studio.mobile-catalog {
    grid-template-areas: 'domains' 'pane' 'save' 'nav';
    grid-template-rows: auto minmax(0, 1fr) auto auto;
  }
  .studio.mobile-catalog > .domains,
  .studio.mobile-catalog > .catalog {
    display: flex;
  }
  .studio.mobile-catalog > .domains {
    grid-area: domains;
    flex-direction: row;
    padding: 10px 12px;
    border-bottom: 1px solid #393d3f;
  }
  .studio.mobile-catalog > .domains button {
    flex: 1;
  }
  .studio.mobile-editor > .editing,
  .studio.mobile-status > .status {
    display: block;
  }
  .studio.mobile-status > .status {
    display: block;
  }
  .studio.mobile-status .status-toggle {
    display: none;
  }
  .status-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .status-heading {
    width: 100%;
  }
  .status-badges {
    flex-wrap: wrap;
  }
  .status-details {
    grid-template-columns: 1fr;
  }
  .selected-role {
    grid-column: auto;
  }
  .mobile-back {
    display: inline-flex !important;
    margin-bottom: 10px;
  }
  .mobile-nav {
    grid-area: nav;
    display: grid !important;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: #0b0d0e;
    border-top: 1px solid #4c4f50;
  }
  .mobile-nav button.active {
    color: #17130c !important;
    background: #cbb477 !important;
  }
  .savebar {
    position: static;
    grid-area: save;
    padding: 9px 12px;
  }
  .savebar > span {
    display: none;
  }
  .savebar > div,
  .savebar button {
    width: 100%;
  }
  .catalog-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
}
</style>
