<template>
  <section class="workspace">
    <article>
      <p class="eyebrow">RUNTIME CAST</p>
      <h2>加入运行角色</h2>
      <p>已存在的同 type + key 角色已自动排除。</p>
      <label>搜索<input v-model="query" type="search" /></label
      ><label
        >类型<select v-model="type">
          <option value="">全部</option>
          <option>user</option>
          <option>主要角色</option>
          <option>次要角色</option>
        </select></label
      ><label
        >派生标签<select v-model="tag">
          <option value="">全部</option>
          <option v-for="v in tags" :key="v">{{ v }}</option>
        </select></label
      >
      <div class="roles">
        <button v-for="r in filtered" :key="r.id" @click="choose(r.id)">
          <strong>{{ assetTitle('角色', r.entry) }}</strong
          ><span>{{ r.entry.type }} · {{ r.tags.join(' / ') || '无标签' }}</span>
        </button>
      </div>
      <p v-if="!filtered.length">没有可加入的候选角色。</p>
    </article>
    <article>
      <p class="eyebrow">PACKAGE LIBRARY</p>
      <h2>开发者兼容工具</h2>
      <p>资产包可承载锁定资源，但不会将它们暴露为普通编辑入口。</p>
      <button @click="exportAll">导出全部资产</button
      ><label class="file">安装资产包<input type="file" accept="application/json" @change="importFile" /></label>
    </article>
    <AppDialog :open="!!pending" title="资产包安装预览" @cancel="pending = undefined"
      ><p v-if="preview">
        新增 {{ preview.added }}·相同 {{ preview.identical }}·冲突 {{ preview.conflicts }}·引用问题
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
      <template #actions><button class="primary" @click="install">确认安装</button></template></AppDialog
    ><AppDialog
      :open="!!overwriteId"
      :title="overwrite?.type === 'user' ? '覆盖运行主角' : '覆盖运行角色'"
      @cancel="overwriteId = ''"
      ><p>将整体替换，不执行字段合并。</p>
      <dl>
        <template v-for="d in runtimeDiff" :key="d.field"
          ><dt>{{ d.field }}</dt>
          <dd>{{ short(d.before) }} → {{ short(d.after) }}</dd></template
        >
      </dl>
      <template #actions><button class="danger" @click="confirmOverwrite">确认整体覆盖</button></template></AppDialog
    >
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { assetsOf, type WorkshopCategory } from '../assets/model';
import {
  createPackage,
  downloadPackage,
  listConflicts,
  mergePackage,
  parsePackage,
  type PackageConflict,
} from '../assets/package';
import { assetTitle, previewPackage, type ImportPreview } from '../assets/presentation';
import { saveScenarioSource } from '../assets/repository';
import { addRoleToRuntime, getRuntimeRoles, type RuntimeRoleSnapshot } from '../assets/runtimeRole';
import type { PackageConflictDecision, ScenarioSourceBundle, WorkshopPackage } from '../scenario/types';
import AppDialog from './AppDialog.vue';
const props = defineProps<{ source: ScenarioSourceBundle }>(),
  emit = defineEmits<{ changed: []; message: [value: { text: string; error?: boolean }] }>();
const query = ref(''),
  type = ref(''),
  tag = ref(''),
  runtime = ref<RuntimeRoleSnapshot>(),
  overwriteId = ref(''),
  pending = ref<WorkshopPackage>(),
  preview = ref<ImportPreview>(),
  conflicts = ref<PackageConflict[]>([]),
  decisions = ref<Record<string, PackageConflictDecision>>({});
const roles = computed(() =>
  Object.entries(props.source.registries.角色).map(([id, entry]) => ({
    id,
    entry,
    tags: [entry.author, ...arr(entry.data?.区域检索词), ...arr(entry.data?.名称检索词)].filter(Boolean),
  })),
);
const tags = computed(() => [...new Set(roles.value.flatMap(r => r.tags))]);
const filtered = computed(() =>
  roles.value.filter(
    r =>
      !exists(r.entry.type, r.entry.key) &&
      (!type.value || r.entry.type === type.value) &&
      (!tag.value || r.tags.includes(tag.value)) &&
      `${r.entry.key} ${r.entry.desc} ${r.tags.join(' ')}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
const overwrite = computed(() => props.source.registries.角色[overwriteId.value]);
const runtimeDiff = computed(() => {
  if (!overwrite.value) return [];
  const before =
    overwrite.value.type === 'user'
      ? runtime.value?.user
      : runtime.value?.[overwrite.value.type]?.[overwrite.value.key];
  return diff(before ?? {}, overwrite.value.data as Record<string, unknown>);
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
function exists(t: string, key: string) {
  if (!runtime.value) return false;
  return t === 'user' ? false : Object.prototype.hasOwnProperty.call(runtime.value[t as '主要角色' | '次要角色'], key);
}
async function choose(id: string) {
  const r = props.source.registries.角色[id];
  if (r.type === 'user') {
    overwriteId.value = id;
    return;
  }
  try {
    await addRoleToRuntime(r);
    runtime.value = await getRuntimeRoles();
    show('角色已加入。');
  } catch (e) {
    show(e, true);
  }
}
async function confirmOverwrite() {
  const r = overwrite.value;
  overwriteId.value = '';
  try {
    await addRoleToRuntime(r, true);
    runtime.value = await getRuntimeRoles();
    show('角色已整体覆盖。');
  } catch (e) {
    show(e, true);
  }
}
function diff(a: Record<string, unknown>, b: Record<string, unknown>) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map(field => ({ field, before: a[field], after: b[field] }));
}
function short(v: unknown) {
  const s = v === undefined ? '未设置' : JSON.stringify(v);
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}
function selection() {
  return Object.fromEntries(Object.entries(assetsOf(props.source)).map(([c, v]) => [c, Object.keys(v)])) as Record<
    WorkshopCategory,
    string[]
  >;
}
function exportAll() {
  downloadPackage(createPackage(props.source, selection()));
}
async function importFile(e: Event) {
  try {
    const input = e.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    pending.value = parsePackage(await file.text());
    preview.value = previewPackage(props.source, pending.value);
    conflicts.value = listConflicts(props.source, pending.value);
    decisions.value = Object.fromEntries(conflicts.value.map(c => [`${c.category}:${c.id}`, 'skip']));
    input.value = '';
  } catch (x) {
    show(x, true);
  }
}
async function install() {
  if (!pending.value) return;
  try {
    await saveScenarioSource(mergePackage(props.source, pending.value, decisions.value));
    pending.value = undefined;
    show('资产包已按审阅决策安装。');
    emit('changed');
  } catch (x) {
    show(x, true);
  }
}
function show(v: unknown, error = false) {
  emit('message', { text: v instanceof Error ? v.message : String(v), error });
}
</script>
<style scoped>
.workspace {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-top: 18px;
}
.workspace article {
  padding: 24px;
  background: #1d2123;
  border: 1px solid #393d3f;
}
.workspace label {
  display: grid;
  gap: 5px;
  margin: 8px 0;
}
.roles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.roles button {
  text-align: left;
}
.roles strong,
.roles span {
  display: block;
}
.roles span {
  color: #b8b09f;
}
.eyebrow {
  color: #cbb477;
  font-size: 10px;
  letter-spacing: 0.18em;
}
.file input {
  display: none;
}
dl {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 6px;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
@media (max-width: 700px) {
  .workspace,
  .roles {
    grid-template-columns: 1fr;
  }
}
</style>
