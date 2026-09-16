<template>
  <section class="workspace">
    <header class="workspace-head">
      <div><p class="eyebrow">RUNTIME CAST</p><h2>加入运行角色</h2><p>从角色库选择成员，加入当前故事。</p></div>
      <div class="package-actions"><label class="file primary">导入资产包<input type="file" accept="application/json" @change="importFile" /></label><button @click="exportAll">导出资产包</button></div>
    </header>
    <div class="filters">
      <label class="search">搜索角色<input v-model="query" type="search" placeholder="名称、作者或简介" /></label>
      <label>角色类型<select v-model="type"><option value="">全部角色</option><option>user</option><option>主要角色</option><option>次要角色</option></select></label>
      <label class="toggle"><input v-model="hideExisting" type="checkbox" />隐藏已在运行中的角色</label>
    </div>
    <div class="roles">
      <article v-for="r in filtered" :key="r.id" class="role-card" :class="{ existing: r.exists }">
        <RoleAvatar :src="r.entry.meta?.avatar" :alt="r.title" />
        <div class="role-copy"><div class="role-heading"><strong>{{ r.title }}</strong><span>{{ r.entry.type }}</span></div><p>{{ r.summary }}</p><small>{{ r.entry.author ? `作者：${r.entry.author}` : '未署名角色' }}</small></div>
        <button :class="{ danger: r.exists }" @click="choose(r.id)">{{ r.exists ? '替换' : '加入' }}</button>
      </article>
    </div>
    <div v-if="!filtered.length" class="empty"><strong>没有符合条件的角色</strong><span>{{ hideExisting ? '可以取消“隐藏已在运行中的角色”查看全部角色。' : '请调整搜索或角色类型。' }}</span></div>
    <AppDialog :open="!!pending" title="资产包安装预览" @cancel="pending = undefined">
      <p v-if="preview">新增 {{ preview.added }} · 相同 {{ preview.identical }} · 冲突 {{ preview.conflicts }} · 引用问题 {{ preview.issues.length }}</p>
      <label v-for="c in conflicts" :key="`${c.category}:${c.id}`">{{ c.category }} · {{ assetTitle(c.category, c.incoming) }}<select v-model="decisions[`${c.category}:${c.id}`]"><option value="skip">保留当前</option><option value="overwrite">整体覆盖</option><option value="copy">复制并重映射引用</option></select></label>
      <template #actions><button class="primary" @click="install">确认安装</button></template>
    </AppDialog>
    <AppDialog :open="!!overwriteId" :title="overwrite?.type === 'user' ? '替换当前主角' : '替换运行角色'" @cancel="overwriteId = ''">
      <p>以下内容将被完整替换，不会与当前数据合并。</p>
      <dl><template v-for="d in runtimeDiff" :key="d.field"><dt>{{ d.field }}</dt><dd>{{ short(d.before) }} → {{ short(d.after) }}</dd></template></dl>
      <template #actions><button class="danger" @click="confirmOverwrite">确认替换</button></template>
    </AppDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import { assetsOf, type WorkshopCategory } from '../assets/model';
import { createPackage, downloadPackage, listConflicts, mergePackage, parsePackage, type PackageConflict } from '../assets/package';
import { assetTitle, previewPackage, type ImportPreview } from '../assets/presentation';
import { saveScenarioSource } from '../assets/repository';
import { addRoleToRuntime, getRuntimeRoles, type RuntimeRoleSnapshot } from '../assets/runtimeRole';
import type { PackageConflictDecision, ScenarioSourceBundle, WorkshopPackage } from '../scenario/types';
import AppDialog from './AppDialog.vue';

const props = defineProps<{ source: ScenarioSourceBundle }>();
const emit = defineEmits<{ changed: []; message: [value: { text: string; error?: boolean }] }>();
const query = ref(''), type = ref(''), hideExisting = ref(true), runtime = ref<RuntimeRoleSnapshot>(), overwriteId = ref(''), pending = ref<WorkshopPackage>(), preview = ref<ImportPreview>(), conflicts = ref<PackageConflict[]>([]), decisions = ref<Record<string, PackageConflictDecision>>({});
const roles = computed(() => Object.entries(props.source.registries.角色).map(([id, entry]) => {
  const title = assetTitle('角色', entry), existing = exists(entry.type, entry.key);
  const summary = entry.type === '次要角色' ? String(entry.data?.简介 || entry.desc || '尚未填写角色简介') : [entry.data?.当前身份, ...arr(entry.data?.外貌概括 ? [entry.data.外貌概括] : entry.data?.外貌).slice(0, 1)].filter(Boolean).join(' · ') || entry.desc || '尚未填写角色简介';
  return { id, entry, title, existing, summary, terms: `${title} ${entry.key} ${entry.author} ${entry.desc}`.toLowerCase() };
}));
const filtered = computed(() => roles.value.filter(r => (!hideExisting.value || !r.exists) && (!type.value || r.entry.type === type.value) && r.terms.includes(query.value.toLowerCase())));
const overwrite = computed(() => props.source.registries.角色[overwriteId.value]);
const runtimeDiff = computed(() => {
  if (!overwrite.value) return [];
  const before = overwrite.value.type === 'user' ? runtime.value?.user : runtime.value?.[overwrite.value.type as '主要角色' | '次要角色']?.[overwrite.value.key];
  return diff(before ?? {}, { ...(overwrite.value.data as Record<string, unknown>), meta: overwrite.value.meta ?? { avatar: '', color: '#C9B485' } });
});
onMounted(async () => { try { runtime.value = await getRuntimeRoles(); } catch (error) { show(error, true); } });
function arr(v: unknown) { return Array.isArray(v) ? v.map(String) : []; }
function exists(t: string, key: string) { if (!runtime.value) return false; return t === 'user' ? Object.keys(runtime.value.user ?? {}).length > 0 : Object.prototype.hasOwnProperty.call(runtime.value[t as '主要角色' | '次要角色'], key); }
async function choose(id: string) {
  const role = props.source.registries.角色[id];
  if (exists(role.type, role.key)) { overwriteId.value = id; return; }
  try { await addRoleToRuntime(role); runtime.value = await getRuntimeRoles(); show('角色已加入当前故事。'); } catch (error) { show(error, true); }
}
async function confirmOverwrite() { const role = overwrite.value; overwriteId.value = ''; try { await addRoleToRuntime(role, true); runtime.value = await getRuntimeRoles(); show('运行角色已完整替换。'); } catch (error) { show(error, true); } }
function diff(a: Record<string, unknown>, b: Record<string, unknown>) { return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(field => ({ field, before: a[field], after: b[field] })); }
function short(v: unknown) { const s = v === undefined ? '未设置' : JSON.stringify(v); return s.length > 60 ? `${s.slice(0, 60)}…` : s; }
function selection() { return Object.fromEntries(Object.entries(assetsOf(props.source)).map(([category, values]) => [category, Object.keys(values)])) as Record<WorkshopCategory, string[]>; }
function exportAll() { downloadPackage(createPackage(props.source, selection())); }
async function importFile(event: Event) {
  try { const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return; pending.value = parsePackage(await file.text()); preview.value = previewPackage(props.source, pending.value); conflicts.value = listConflicts(props.source, pending.value); decisions.value = Object.fromEntries(conflicts.value.map(c => [`${c.category}:${c.id}`, 'skip'])); input.value = ''; } catch (error) { show(error, true); }
}
async function install() { if (!pending.value) return; try { await saveScenarioSource(mergePackage(props.source, pending.value, decisions.value)); pending.value = undefined; show('资产包已安装。'); emit('changed'); } catch (error) { show(error, true); } }
function show(value: unknown, error = false) { emit('message', { text: value instanceof Error ? value.message : String(value), error }); }
</script>

<style scoped>
.workspace { margin-top: 18px; }
.workspace-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 24px 26px; background: radial-gradient(circle at 12% 0, rgba(197,160,89,.14), transparent 36%), #15181b; border: 1px solid #3b3932; }
.workspace-head h2 { margin: 3px 0 6px; font: 500 26px Georgia, serif; }
.workspace-head p { color: #aaa397; }
.package-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.file { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.file input { display: none; }
.eyebrow { color: #cbb477 !important; font-size: 10px; letter-spacing: .2em; }
.filters { display: grid; grid-template-columns: minmax(260px, 1fr) 200px auto; gap: 12px; align-items: end; padding: 16px 0; }
.filters label { display: grid; gap: 6px; color: #aaa397; font-size: 12px; }
.filters .toggle { display: flex; align-items: center; min-height: 36px; gap: 8px; color: #e7dfd0; }
.toggle input { width: auto !important; }
.roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 12px; }
.role-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 16px; align-items: center; min-width: 0; padding: 18px; background: linear-gradient(135deg, #1b1e21, #141619); border: 1px solid #363a3d; border-left: 2px solid #c5a059; transition: transform .18s ease, border-color .18s ease; }
.role-card:hover { transform: translateY(-2px); border-color: #74684c; }
.role-card.existing { border-left-color: #a9655e; }
.role-copy { min-width: 0; }
.role-heading { display: flex; align-items: baseline; gap: 9px; }
.role-heading strong { overflow: hidden; color: #f0e8d9; font: 600 17px Georgia, serif; text-overflow: ellipsis; white-space: nowrap; }
.role-heading span { color: #c5a059; font-size: 11px; letter-spacing: .08em; }
.role-copy p { display: -webkit-box; margin: 7px 0; overflow: hidden; color: #bbb3a5; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.role-copy small { color: #777b7e; }
.empty { display: grid; gap: 6px; place-items: center; padding: 70px 20px; color: #8e8a82; border: 1px dashed #3d4042; }
dl { display: grid; grid-template-columns: minmax(90px, 1fr) 2fr; gap: 7px; }
dd { margin: 0; overflow-wrap: anywhere; }
@media (max-width: 760px) { .workspace-head { align-items: stretch; flex-direction: column; } .filters { grid-template-columns: 1fr; } .roles { grid-template-columns: 1fr; } .role-card { grid-template-columns: auto minmax(0, 1fr); } .role-card > button { grid-column: 1 / -1; } }
</style>
