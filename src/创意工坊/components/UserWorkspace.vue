<template>
  <section class="workspace">
    <header class="workspace-head">
      <div>
        <p class="eyebrow">RUNTIME CAST</p>
        <h2>加入运行角色</h2>
        <p>从角色库选择成员，加入当前故事。</p>
      </div>
      <div class="package-actions">
        <label class="file primary"
          >导入资产包<input type="file" accept="application/json" @change="importFile" /></label
        ><button @click="openExport">选择导出</button>
      </div>
    </header>
    <div class="filters">
      <label class="search">搜索角色<input v-model="query" type="search" placeholder="名称、作者或简介" /></label>
      <label
        >角色类型<select v-model="type">
          <option value="">全部角色</option>
          <option>user</option>
          <option>主要角色</option>
          <option>次要角色</option>
        </select></label
      >
      <label class="toggle"><input v-model="hideExisting" type="checkbox" />隐藏已在运行中的角色</label>
    </div>
    <div class="roles">
      <article
        v-for="group in filteredGroups"
        :key="group.identity"
        class="role-card"
        :class="{ existing: group.exists }"
      >
        <RoleAvatar
          :src="group.items[0].entry.meta?.avatar"
          :alt="group.title"
          :seed="group.items[0].entry.key"
          :fallback-style="group.items[0].entry.meta?.avatarStyle"
          :theme-color="group.items[0].entry.meta?.color"
        />
        <div class="role-copy">
          <div class="role-heading">
            <strong>{{ group.title }}</strong
            ><span>{{ group.type }}</span>
          </div>
          <p>{{ group.summary }}</p>
          <small>{{ group.items.length }} 个版本{{ group.exists ? ' · 已在当前故事中' : '' }}</small>
        </div>
        <div class="role-actions">
          <button @click="toggleVersions(group.identity)">
            {{ expandedIdentity === group.identity ? '收起版本' : '选择版本' }}
          </button>
        </div>
        <div v-if="expandedIdentity === group.identity" class="role-versions">
          <div v-for="item in group.items" :key="item.id" class="role-version">
            <span
              ><strong>{{ item.entry.author || '未署名版本' }}</strong
              ><small>{{ item.entry.desc || item.summary }}</small></span
            >
            <div class="version-actions">
              <button @click="previewId = item.id">预览</button>
              <button :class="{ danger: group.exists }" @click="choose(item.id)">
                {{ group.exists ? '替换此版本' : '加入此版本' }}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
    <div v-if="!filteredGroups.length" class="empty">
      <strong>没有符合条件的角色</strong
      ><span>{{ hideExisting ? '可以取消“隐藏已在运行中的角色”查看全部角色。' : '请调整搜索或角色类型。' }}</span>
    </div>
    <AppDialog :open="!!pending" title="资产包安装预览" @cancel="pending = undefined">
      <p v-if="preview">
        新增 {{ preview.added }} · 相同 {{ preview.identical }} · 冲突 {{ preview.conflicts }} · 引用问题
        {{ preview.issues.length }}
      </p>
      <label v-for="c in conflicts" :key="`${c.category}:${c.id}`"
        >{{ c.category }} · {{ assetTitle(c.category, c.incoming)
        }}<select v-model="decisions[`${c.category}:${c.id}`]">
          <option value="skip">保留当前</option>
          <option value="overwrite">整体覆盖</option>
          <option value="copy">复制并重映射引用</option>
        </select></label
      >
      <template #actions><button class="primary" @click="install">确认安装</button></template>
    </AppDialog>
    <AppDialog
      :open="!!previewRole"
      :title="previewRole ? `${assetTitle('角色', previewRole)} · 角色预览` : '角色预览'"
      @cancel="previewId = ''"
    >
      <div v-if="previewRole" class="role-preview">
        <CharPanel :data="previewData" :char-type="previewCharType" mode="view" />
      </div>
      <template #actions
        ><button :class="{ danger: previewExists }" @click="chooseFromPreview">
          {{ previewExists ? '替换此角色' : '加入此角色' }}
        </button></template
      >
    </AppDialog>
    <AppDialog :open="exportOpen" title="选择导出资产" @cancel="exportOpen = false">
      <p class="export-hint">可按分类或具体资产选择。选中剧本时，其引用的角色与叙事资源会自动包含。</p>
      <div class="export-list">
        <section v-for="group in exportGroups" :key="group.category">
          <label class="export-category"
            ><input
              type="checkbox"
              :checked="group.allSelected"
              @change="toggleCategory(group.category, ($event.target as HTMLInputElement).checked)"
            />{{ group.category }}<small>{{ group.items.length }} 项</small></label
          >
          <label v-for="item in group.items" :key="`${group.category}:${item.id}`"
            ><input v-model="exportSelection[`${group.category}:${item.id}`]" type="checkbox" />{{ item.title }}</label
          >
        </section>
      </div>
      <p>已选 {{ explicitExportCount }} 项；最终导出 {{ finalExportCount }} 项（含自动依赖）。</p>
      <template #actions
        ><button class="primary" :disabled="!explicitExportCount" @click="confirmExport">导出所选资产</button></template
      >
    </AppDialog>
    <AppDialog
      :open="!!overwriteId"
      :title="overwrite?.type === 'user' ? '替换当前主角' : '替换运行角色'"
      @cancel="overwriteId = ''"
    >
      <p>以下内容将被完整替换，不会与当前数据合并。</p>
      <dl>
        <template v-for="d in runtimeDiff" :key="d.field"
          ><dt>{{ d.field }}</dt>
          <dd>{{ short(d.before) }} → {{ short(d.after) }}</dd></template
        >
      </dl>
      <template #actions><button class="danger" @click="confirmOverwrite">确认替换</button></template>
    </AppDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import CharPanel from '../../尘史使徒/UI/components/role/CharPanel.vue';
import { assetsOf, roleIdentityOf, type WorkshopCategory } from '../assets/model';
import {
  createPackage,
  downloadPackage,
  listConflicts,
  mergePackage,
  parsePackage,
  type PackageConflict,
} from '../assets/package';
import { assetTitle, previewPackage, workshopCategories, type ImportPreview } from '../assets/presentation';
import { saveScenarioSource } from '../assets/repository';
import { addRoleToRuntime, getRuntimeRoles, runtimeRoleExists, type RuntimeRoleSnapshot } from '../assets/runtimeRole';
import type { PackageConflictDecision, ScenarioSourceBundle, WorkshopPackage } from '../scenario/types';
import AppDialog from './AppDialog.vue';

const props = defineProps<{ source: ScenarioSourceBundle }>();
const emit = defineEmits<{ changed: []; message: [value: { text: string; error?: boolean }] }>();
const query = ref(''),
  type = ref(''),
  hideExisting = ref(true),
  expandedIdentity = ref(''),
  runtime = ref<RuntimeRoleSnapshot>(),
  previewId = ref(''),
  overwriteId = ref(''),
  exportOpen = ref(false),
  exportSelection = ref<Record<string, boolean>>({}),
  pending = ref<WorkshopPackage>(),
  preview = ref<ImportPreview>(),
  conflicts = ref<PackageConflict[]>([]),
  decisions = ref<Record<string, PackageConflictDecision>>({});
const roleGroups = computed(() => {
  const groups = new Map<string, { id: string; entry: ScenarioSourceBundle['registries']['角色'][string] }[]>();
  for (const [id, entry] of Object.entries(props.source.registries.角色)) {
    const identity = roleIdentityOf(entry);
    groups.set(identity, [...(groups.get(identity) ?? []), { id, entry }]);
  }
  return [...groups.entries()].map(([identity, items]) => {
    const primary = items[0].entry;
    const title = assetTitle('角色', primary);
    const summary =
      primary.type === '次要角色'
        ? String(primary.data?.简介 || primary.desc || '尚未填写角色简介')
        : [
            primary.data?.当前身份,
            ...arr(primary.data?.外貌概括 ? [primary.data.外貌概括] : primary.data?.外貌).slice(0, 1),
          ]
            .filter(Boolean)
            .join(' · ') ||
          primary.desc ||
          '尚未填写角色简介';
    return {
      identity,
      items: items.map(item => ({ ...item, summary })),
      type: primary.type,
      title,
      exists: roleExists(primary.type, primary.key),
      summary,
      terms: items
        .map(item => `${assetTitle('角色', item.entry)} ${item.entry.key} ${item.entry.author} ${item.entry.desc}`)
        .join(' ')
        .toLowerCase(),
    };
  });
});
const filteredGroups = computed(() =>
  roleGroups.value.filter(
    group =>
      (!hideExisting.value || !group.exists) &&
      (!type.value || group.type === type.value) &&
      group.terms.includes(query.value.toLowerCase()),
  ),
);
const overwrite = computed(() => props.source.registries.角色[overwriteId.value]);
const previewRole = computed(() => props.source.registries.角色[previewId.value]);
const previewExists = computed(() => !!previewRole.value && roleExists(previewRole.value.type, previewRole.value.key));
const previewData = computed(() => ({ ...(previewRole.value?.data as object), meta: previewRole.value?.meta }));
const previewCharType = computed(
  () => ({ user: 'user', 主要角色: 'main', 次要角色: 'minor' })[previewRole.value?.type ?? ''] ?? 'main',
);
const exportGroups = computed(() => {
  const all = assetsOf(props.source);
  return workshopCategories
    .map(category => ({
      category,
      items: Object.entries(all[category]).map(([id, value]) => ({ id, title: assetTitle(category, value) })),
      allSelected:
        Object.keys(all[category]).length > 0 &&
        Object.keys(all[category]).every(id => exportSelection.value[`${category}:${id}`]),
    }))
    .filter(group => group.items.length);
});
const explicitExportCount = computed(() => Object.values(exportSelection.value).filter(Boolean).length);
const exportPackage = computed(() => createPackage(props.source, selectedAssets()));
const finalExportCount = computed(() =>
  Object.values(exportPackage.value.assets).reduce((count, entries) => count + Object.keys(entries ?? {}).length, 0),
);
const runtimeDiff = computed(() => {
  if (!overwrite.value) return [];
  const before =
    overwrite.value.type === 'user'
      ? runtime.value?.user
      : runtime.value?.[overwrite.value.type as '主要角色' | '次要角色']?.[overwrite.value.key];
  return diff(before ?? {}, {
    ...(overwrite.value.data as Record<string, unknown>),
    meta: overwrite.value.meta ?? { avatar: '', color: '#C9B485' },
  });
});
onMounted(async () => {
  try {
    runtime.value = await getRuntimeRoles();
  } catch (error) {
    show(error, true);
  }
});
function arr(v: unknown) {
  return Array.isArray(v) ? v.map(String) : [];
}
function roleExists(t: string, key: string) {
  return runtime.value ? runtimeRoleExists(runtime.value, t, key) : false;
}
function toggleVersions(identity: string) {
  expandedIdentity.value = expandedIdentity.value === identity ? '' : identity;
}
async function choose(id: string) {
  const role = props.source.registries.角色[id];
  if (roleExists(role.type, role.key)) {
    overwriteId.value = id;
    return;
  }
  try {
    const result = await addRoleToRuntime(role);
    if (result === 'conflict') {
      runtime.value = await getRuntimeRoles();
      overwriteId.value = id;
      return;
    }
    runtime.value = await getRuntimeRoles();
    show('角色已加入当前故事。');
  } catch (error) {
    show(error, true);
  }
}
function chooseFromPreview() {
  const id = previewId.value;
  previewId.value = '';
  if (id) void choose(id);
}
async function confirmOverwrite() {
  const role = overwrite.value;
  overwriteId.value = '';
  try {
    await addRoleToRuntime(role, true);
    runtime.value = await getRuntimeRoles();
    show('运行角色已完整替换。');
  } catch (error) {
    show(error, true);
  }
}
function diff(a: Record<string, unknown>, b: Record<string, unknown>) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map(field => ({ field, before: a[field], after: b[field] }));
}
function short(v: unknown) {
  const s = v === undefined ? '未设置' : JSON.stringify(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}
function selectedAssets() {
  const result: Partial<Record<WorkshopCategory, string[]>> = {};
  for (const key of Object.keys(exportSelection.value).filter(key => exportSelection.value[key])) {
    const separator = key.indexOf(':');
    const category = key.slice(0, separator) as WorkshopCategory;
    (result[category] ??= []).push(key.slice(separator + 1));
  }
  return result;
}
function openExport() {
  exportSelection.value = {};
  exportOpen.value = true;
}
function toggleCategory(category: WorkshopCategory, checked: boolean) {
  for (const id of Object.keys(assetsOf(props.source)[category])) exportSelection.value[`${category}:${id}`] = checked;
}
function confirmExport() {
  if (!explicitExportCount.value) return;
  downloadPackage(exportPackage.value);
  exportOpen.value = false;
}
async function importFile(event: Event) {
  try {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    pending.value = parsePackage(await file.text());
    preview.value = previewPackage(props.source, pending.value);
    conflicts.value = listConflicts(props.source, pending.value);
    decisions.value = Object.fromEntries(conflicts.value.map(c => [`${c.category}:${c.id}`, 'skip']));
    input.value = '';
  } catch (error) {
    show(error, true);
  }
}
async function install() {
  if (!pending.value) return;
  try {
    await saveScenarioSource(mergePackage(props.source, pending.value, decisions.value));
    pending.value = undefined;
    show('资产包已安装。');
    emit('changed');
  } catch (error) {
    show(error, true);
  }
}
function show(value: unknown, error = false) {
  emit('message', { text: value instanceof Error ? value.message : String(value), error });
}
</script>

<style scoped>
.workspace {
  margin-top: 18px;
}
.workspace-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 26px;
  background: radial-gradient(circle at 12% 0, rgba(197, 160, 89, 0.14), transparent 36%), #15181b;
  border: 1px solid #3b3932;
}
.workspace-head h2 {
  margin: 3px 0 6px;
  font:
    500 26px Georgia,
    serif;
}
.workspace-head p {
  color: #aaa397;
}
.package-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.file {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.file input {
  display: none;
}
.eyebrow {
  color: #cbb477 !important;
  font-size: 10px;
  letter-spacing: 0.2em;
}
.filters {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 200px auto;
  gap: 12px;
  align-items: end;
  padding: 16px 0;
}
.filters label {
  display: grid;
  gap: 6px;
  color: #aaa397;
  font-size: 12px;
}
.filters .toggle {
  display: flex;
  align-items: center;
  min-height: 36px;
  gap: 8px;
  color: #e7dfd0;
}
.toggle input {
  width: auto !important;
}
.roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr));
  gap: 12px;
}
.role-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-width: 0;
  padding: 18px;
  background: linear-gradient(135deg, #1b1e21, #141619);
  border: 1px solid #363a3d;
  border-left: 2px solid #c5a059;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}
.role-card:hover {
  transform: translateY(-2px);
  border-color: #74684c;
}
.role-card.existing {
  border-left-color: #a9655e;
}
.role-actions {
  display: grid;
  gap: 7px;
}
.role-versions {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #363a3d;
}
.role-version {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #111416;
}
.role-version > span {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.role-version small {
  overflow: hidden;
  color: #8e8a82;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.version-actions {
  display: flex;
  flex: none;
  gap: 7px;
}
.role-copy {
  min-width: 0;
}
.role-heading {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.role-heading strong {
  overflow: hidden;
  color: #f0e8d9;
  font:
    600 17px Georgia,
    serif;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-heading span {
  color: #c5a059;
  font-size: 11px;
  letter-spacing: 0.08em;
}
.role-copy p {
  display: -webkit-box;
  margin: 7px 0;
  overflow: hidden;
  color: #bbb3a5;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.role-copy small {
  color: #777b7e;
}
.empty {
  display: grid;
  gap: 6px;
  place-items: center;
  padding: 70px 20px;
  color: #8e8a82;
  border: 1px dashed #3d4042;
}
dl {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) 2fr;
  gap: 7px;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.role-preview {
  height: min(62dvh, 620px);
  min-height: 420px;
  overflow: hidden;
}
.export-hint,
.export-category small {
  color: #aaa397;
}
.export-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  max-height: 52vh;
  overflow: auto;
}
.export-list section,
.export-list label {
  display: grid;
  gap: 6px;
}
.export-list section {
  align-content: start;
  padding: 10px;
  border: 1px solid #3b3932;
}
.export-list label {
  grid-template-columns: auto 1fr;
  align-items: center;
}
.export-list input {
  width: auto !important;
  min-height: 0 !important;
}
.export-category {
  color: #cbb477;
  font-weight: 700;
}
.export-category small {
  margin-left: auto;
  font-weight: 400;
}
@media (max-width: 760px) {
  .workspace-head {
    align-items: stretch;
    flex-direction: column;
  }
  .filters {
    grid-template-columns: 1fr;
  }
  .roles {
    grid-template-columns: 1fr;
  }
  .role-card {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .role-actions {
    grid-column: 1 / -1;
    grid-template-columns: 1fr 1fr;
  }
  .role-version {
    align-items: stretch;
    flex-direction: column;
  }
  .version-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .role-preview {
    height: calc(100dvh - 190px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    min-height: 0;
  }
}
</style>
