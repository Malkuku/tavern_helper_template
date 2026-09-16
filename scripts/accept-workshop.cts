import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assetsOf, deleteAsset, findReferenceIssues, findReferencesTo } from '../src/创意工坊/assets/model';
import { createPackage, mergePackage, parsePackage } from '../src/创意工坊/assets/package';
import { createDefaultAsset, defaultRoleData, diffSources, previewPackage, workshopCategories } from '../src/创意工坊/assets/presentation';
import { serializeScenarioSource } from '../src/创意工坊/assets/repository';
import { parseScenarioSourceEntries, scenarioWorldbookEntryNames } from '../src/创意工坊/scenario/worldbookSource';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const betaDir = process.argv[2];
assert.ok(betaDir, '必须提供 Beta 配置目录，独立验收不接受合成数据代替真实样本');
const entries = Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({
  name,
  content: readFileSync(join(betaDir, `${category}.json`), 'utf8'),
}));
const beta = parseScenarioSourceEntries(entries);

// 真实十三类：不改保存必须逐字义等价；单字段修改不得影响未知可选字段、联合类型与数组顺序。
assert.deepEqual(serializeScenarioSource(beta), beta);
for (const category of workshopCategories) {
  const registry = assetsOf(beta)[category];
  for (const [id, value] of Object.entries(registry)) {
    const isolated = structuredClone(beta);
    assert.deepEqual(serializeScenarioSource(isolated), isolated, `${category}:${id} 往返损坏`);
  }
}
const role = Object.entries(beta.registries.角色).find(([, value]) => value.type === '主要角色');
assert.ok(role, 'Beta 应包含主要角色');
const edited = structuredClone(beta);
edited.registries.角色[role[0]].desc += '（独立验收）';
const roleBefore = structuredClone(beta.registries.角色[role[0]]);
const roleAfter = serializeScenarioSource(edited).registries.角色[role[0]];
assert.equal(roleAfter.desc, `${roleBefore.desc}（独立验收）`);
assert.deepEqual({ ...roleAfter, desc: roleBefore.desc }, roleBefore, '单字段修改污染其他字段或联合类型');

// 新建完整性与角色三分支。
for (const category of workshopCategories) {
  const value = createDefaultAsset(category);
  assert.equal(typeof value.author, 'string');
  if (category === '开场白') assert.deepEqual(Object.keys(value.内容配置).sort(), ['世界','世界经济','主线','事件','任务','势力','地图','季节与节日','开场文本','种族','角色'].sort());
}
for (const type of ['user', '主要角色', '次要角色']) {
  const value = createDefaultAsset('角色');
  value.type = type;
  const data = defaultRoleData(type);
  for (const key of ['基础数值', '生命状态', '技能', '术之等级', '特殊状态', '物品']) assert.ok(key in data, `${type} 缺少 ${key}`);
}

// 真实新增、修改、删除字段 diff。
const diffTarget = structuredClone(beta);
const worldId = Object.keys(diffTarget.registries.世界)[0];
diffTarget.registries.世界[worldId].data.__acceptance = 'new';
const removedId = Object.keys(diffTarget.registries.事件)[0];
delete diffTarget.registries.事件[removedId];
diffTarget.registries.任务['acceptance-task'] = { author: '', desc: '', key: '验收任务', data: { 描述: '', 目标: '', 阻碍: '', 期望奖励: '', 取得成果: [] } };
const changes = diffSources(beta, diffTarget);
assert.ok(changes.some(x => x.kind === 'modified' && x.fields.some(f => f.path === 'data.__acceptance')));
assert.ok(changes.some(x => x.kind === 'removed' && x.id === removedId));
assert.ok(changes.some(x => x.kind === 'added' && x.id === 'acceptance-task'));

// 删除影响必须列出来源；取消（force=false）不改数据；确认才按既有语义清理。
const referenced = Object.entries(beta.scenarios).flatMap(([ownerId, scenario]) => scenario.内容配置.角色.map(id => ({ ownerId, id })))[0];
assert.ok(referenced, 'Beta 应包含角色引用');
const deletion = structuredClone(beta);
const snapshot = structuredClone(deletion);
const impacts = findReferencesTo(deletion, '角色', referenced.id);
assert.ok(impacts.some(x => x.ownerId === referenced.ownerId && x.field === '角色'));
assert.ok(deleteAsset(deletion, '角色', referenced.id, false).length);
assert.deepEqual(deletion, snapshot, '取消删除改变了草稿');
deleteAsset(deletion, '角色', referenced.id, true);
assert.ok(!deletion.registries.角色[referenced.id]);
assert.ok(!deletion.scenarios[referenced.ownerId].内容配置.角色.includes(referenced.id));

// 导入：无冲突也必须产生预览；新增/相同/冲突/缺失引用以及三种决策。
const selectedRoleId = role[0];
const incoming = structuredClone(beta);
incoming.registries.角色[selectedRoleId].desc = '冲突版本';
incoming.registries.任务['incoming-new'] = { author: '', desc: '', key: '新增任务', data: { 描述: '', 目标: '', 阻碍: '', 期望奖励: '', 取得成果: [] } };
const packageSelection = { 角色: [selectedRoleId], 任务: ['incoming-new'], 世界: [worldId] } as const;
const pkg = parsePackage(JSON.stringify(createPackage(incoming, packageSelection)));
const preview = previewPackage(beta, pkg);
assert.ok(preview.added >= 1 && preview.identical >= 1 && preview.conflicts >= 1);
assert.equal(mergePackage(beta, pkg, { [`角色:${selectedRoleId}`]: 'skip' }).registries.角色[selectedRoleId].desc, beta.registries.角色[selectedRoleId].desc);
assert.equal(mergePackage(beta, pkg, { [`角色:${selectedRoleId}`]: 'overwrite' }).registries.角色[selectedRoleId].desc, '冲突版本');
const copied = mergePackage(beta, pkg, { [`角色:${selectedRoleId}`]: 'copy' });
assert.ok(Object.keys(copied.registries.角色).length > Object.keys(beta.registries.角色).length);
const brokenIncoming = structuredClone(incoming);
brokenIncoming.scenarios[Object.keys(brokenIncoming.scenarios)[0]].内容配置.世界 = 'missing-world';
const brokenPkg = createPackage(brokenIncoming, { 开场白: [Object.keys(brokenIncoming.scenarios)[0]] });
assert.ok(previewPackage(beta, brokenPkg).issues.some(x => x.targetId === 'missing-world'));

// UI 静态门禁：产品入口、草稿拦截、应用内对话框、焦点环、状态和窄屏结构。
const app = readFileSync(join(process.cwd(), 'src/创意工坊/App.vue'), 'utf8');
const developer = readFileSync(join(process.cwd(), 'src/创意工坊/components/DeveloperWorkspace.vue'), 'utf8');
const user = readFileSync(join(process.cwd(), 'src/创意工坊/components/UserWorkspace.vue'), 'utf8');
const dialog = readFileSync(join(process.cwd(), 'src/创意工坊/components/AppDialog.vue'), 'utf8');
const sourceText = `${app}\n${developer}\n${user}\n${dialog}`;
assert.doesNotMatch(sourceText, /\b(?:confirm|prompt)\s*\(/);
assert.doesNotMatch(sourceText, /StructuredValueEditor/);
for (const token of ['beforeunload', 'pagehide', '重新读取', '放弃草稿', '收起工作坊', "switchWorkspace('user')", '资产包安装预览', '导出预览', '没有匹配结果', '还没有', '正在读取', '无法打开工作区']) assert.ok(sourceText.includes(token), `缺少 UI 门禁：${token}`);
assert.ok(dialog.includes('@keydown.tab="keepFocus"'));
assert.ok(sourceText.includes('@media(max-width:700px)') || sourceText.includes('@media (max-width: 700px)'));
assert.equal(findReferenceIssues(beta).length, 0, '真实 Beta 自身存在缺失引用，需明确判定而非忽略');

console.info('独立验收通过：真实 Beta 无损、默认值、真实 diff、删除影响、导入矩阵、旧路径取缔及 UI 静态门禁。');
