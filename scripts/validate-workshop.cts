import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  deleteAsset,
  findReferenceIssues,
  normalizeRoleSelection,
  normalizeRoleEnums,
  normalizeScenarioAvailability,
  syncRoleVitalsToMaximum,
} from '../src/创意工坊/assets/model';
import { createPackage, listConflicts, mergePackage, parsePackage } from '../src/创意工坊/assets/package';
import {
  createDefaultAsset,
  diffSources,
  previewPackage,
  workshopCategories,
} from '../src/创意工坊/assets/presentation';
import { buildRoleGenerationPrompt, parseGeneratedRole } from '../src/创意工坊/assets/roleGenerator';
import { serializeScenarioSource } from '../src/创意工坊/assets/repository';
import {
  parseScenarioSourceEntries,
  scenarioWorldbookEntryNames,
  synchronizeAutomaticReferences,
} from '../src/创意工坊/scenario/worldbookSource';
import type { ScenarioSourceBundle } from '../src/创意工坊/scenario/types';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const entry = { author: 'a', desc: 'd', key: 'k', data: {} };
const source: ScenarioSourceBundle = {
  fixedData: {},
  scenarios: {
    s: {
      author: 'a',
      key: 's',
      desc: '',
      可用: true,
      主题: '',
      图标: '',
      自定义主角: false,
      内容配置: {
        开场文本: 'text',
        世界: 'world',
        角色: ['role'],
        地图: 'map',
        世界经济: [],
        季节与节日: [],
        势力: [],
        种族: [],
        主线: 'main',
        任务: [],
        事件: [],
      },
    },
  },
  registries: {
    世界: { world: { author: 'a', desc: '', data: {} } },
    世界经济: {},
    主线: { main: { author: 'a', desc: '', data: {} } },
    事件: {},
    任务: {},
    势力: {},
    地图: { map: { author: 'a', desc: '', data: { 城市: { 描述: '城' } } } },
    季节与节日: {},
    开场文本: { text: { author: 'a', desc: '', data: 'hello' } },
    种族: {},
    角色: { role: { ...entry, type: 'user' } },
  },
};
assert.deepEqual(findReferenceIssues(source), []);
const unavailable = structuredClone(source);
unavailable.scenarios.s.内容配置 = {
  开场文本: '',
  世界: '',
  角色: [],
  地图: '',
  世界经济: [],
  季节与节日: [],
  势力: [],
  种族: [],
  主线: '',
  任务: [],
  事件: [],
};
normalizeScenarioAvailability(unavailable);
assert.equal(unavailable.scenarios.s.可用, false);
const blocked = structuredClone(source);
assert.equal(deleteAsset(blocked, '角色', 'role', false).length, 1);
assert.ok(blocked.registries.角色.role);
deleteAsset(blocked, '角色', 'role', true);
assert.deepEqual(blocked.scenarios.s.内容配置.角色, []);
source.registries.角色.role.meta = { avatar: '/user/files/role.webp', color: '#AABBCC', avatarStyle: '4' };
const pkg = createPackage(source, { 开场白: ['s'], 角色: ['role'] });
const parsedPackage = parsePackage(JSON.stringify(pkg));
assert.equal(parsedPackage.version, 2);
assert.deepEqual(parsedPackage.assets.角色.role.meta, source.registries.角色.role.meta);
const legacyPackage = {
  format: 'dust-history-workshop-package',
  version: 1,
  exportedAt: new Date().toISOString(),
  assets: { 地图: { legacy: { author: 'a', desc: '旧地图', root: { node: {} } } }, 地图节点: { node: entry } },
};
assert.throws(() => parsePackage(JSON.stringify(legacyPackage)));
const sourceEntries = Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({
  name,
  content: JSON.stringify(
    category === '开场白'
      ? { 固定数据: source.fixedData, 开场白: source.scenarios }
      : { [category]: source.registries[category as keyof typeof source.registries] },
  ),
}));
assert.throws(
  () =>
    parseScenarioSourceEntries([
      ...sourceEntries,
      { name: '<地图节点>配置', content: JSON.stringify({ 地图节点: {} }) },
    ]),
  /不支持旧地图节点配置/,
);
const legacyMapEntries = sourceEntries.map(entry =>
  entry.name === '<地图>配置'
    ? { ...entry, content: JSON.stringify({ 地图: { map: { author: 'a', desc: '', root: {} } } }) }
    : entry,
);
assert.throws(() => parseScenarioSourceEntries(legacyMapEntries));
const target = structuredClone(source);
target.registries.角色.role.data = { changed: true };
assert.equal(listConflicts(target, pkg).length, 1);
const merged = mergePackage(target, pkg, { '角色:role': 'copy' });
const copied = Object.keys(merged.registries.角色).find(id => id !== 'role');
assert.ok(copied);
assert.deepEqual(merged.scenarios.s.内容配置.角色, [copied]);

for (const category of workshopCategories) {
  const value = createDefaultAsset(category);
  assert.equal(typeof value.author, 'string', `${category} 默认值应包含作者`);
  if (category === '开场白') assert.equal(Object.keys(value.内容配置).length, 11);
  else if (category === '地图') assert.deepEqual(value.data, {});
  else assert.ok('data' in value, `${category} 默认值应包含领域数据`);
}
assert.equal(createDefaultAsset('角色').key, 'user', '新建 user 角色的 key 必须锁定为 user');
const roleTypes = ['user', '主要角色', '次要角色'];
for (const type of roleTypes) {
  const role = createDefaultAsset('角色');
  role.type = type;
  assert.ok(role.data.基础数值 && role.data.生命状态 && role.data.技能 && role.data.物品);
}
const changed = structuredClone(source);
changed.registries.世界.world.data = { 时间: '午后' };
const diff = diffSources(source, changed);
assert.equal(diff.length, 1);
assert.equal(diff[0].fields[0].path, 'data.时间');
const preview = previewPackage(target, pkg);
assert.equal(preview.conflicts, 1);
assert.equal(preview.identical, 1);
assert.deepEqual(serializeScenarioSource(source), source, '内存结构应无损往返');
const generatedRole = parseGeneratedRole(
  '{"author":"AI","key":"雾鸦","data":{"姓名":"雾鸦","基础数值":{"力量":8}}}',
  '主要角色',
);
assert.equal(generatedRole.data.姓名, '雾鸦');
assert.equal((generatedRole.data.基础数值 as any).力量, 8);
assert.ok((generatedRole.data.基础数值 as any).敏捷 === 0, '生成角色应由固定模板补齐字段');
assert.equal(
  parseGeneratedRole('{"key":"任意值","data":{}}', 'user').key,
  'user',
  'AI 生成 user 的 key 必须锁定为 user',
);
assert.throws(() => parseGeneratedRole('不是 JSON', '主要角色'), /不是可解析的角色 JSON/);
assert.match(buildRoleGenerationPrompt('主要角色', '雾中信使', '克制', '规则正文', source), /雾中信使/);
{
  const roles = {
    user1: { ...entry, type: 'user' },
    user2: { ...entry, type: 'user' },
    early: { ...entry, type: '主要角色', key: '同一人' },
    late: { ...entry, type: '主要角色', key: '同一人' },
    other: { ...entry, type: '次要角色', key: '同一人' },
  } as any;
  assert.deepEqual(normalizeRoleSelection(['user1', 'early', 'other', 'late', 'user2'], roles), [
    'other',
    'late',
    'user2',
  ]);
}
const automatic = structuredClone(source);
automatic.registries.世界经济.economy = { ...entry, key: '经济' };
automatic.registries.势力.faction = { ...entry, key: '势力' };
synchronizeAutomaticReferences(automatic);
assert.deepEqual(automatic.scenarios.s.内容配置.世界经济, ['economy']);
assert.deepEqual(automatic.scenarios.s.内容配置.势力, ['faction']);

const roleEditorSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/RoleEditor.vue'), 'utf8');
for (const component of [
  'LifeStatusModule',
  'SkillModule',
  'SpecialStatusModule',
  'InventoryModule',
  'RelationshipModule',
]) {
  assert.match(roleEditorSource, new RegExp(`<${component}`), `工坊必须直接复用 ${component}`);
}
for (const removedKind of ['关系', '技能', '状态', '物品']) {
  assert.doesNotMatch(
    roleEditorSource,
    new RegExp(`RoleCardCollection[^>]+kind="${removedKind}"`),
    `${removedKind}不得继续走工坊独立编辑器`,
  );
}
assert.doesNotMatch(roleEditorSource, /基础数值\[f\].*type="number"/s, '基础数值不得保留编辑输入框');
assert.doesNotMatch(roleEditorSource, /id: 'stats'/, '基础状态不得保留独立页签');
assert.match(roleEditorSource, /id: 'skills'.*基础状态、能力和性相/s, '基础状态必须并入技能与术分区');
assert.match(roleEditorSource, /<ArtLevelEditor/, '术之等级必须使用固定性相加点组件');
assert.match(roleEditorSource, /v-model="entry\.meta\.avatar"/, '头像地址必须直接写入 meta.avatar');
assert.match(roleEditorSource, /hasAvatar \? '图片头像' : '默认头像'/, '图片头像必须优先于默认头像状态');
const developerWorkspaceSource = readFileSync(
  join(process.cwd(), 'src/创意工坊/components/DeveloperWorkspace.vue'),
  'utf8',
);
assert.match(developerWorkspaceSource, /current\.desc\?\.trim\(\) \|\| '暂无素材说明'/, '角色版本必须显示素材说明');
assert.doesNotMatch(developerWorkspaceSource, /`区别：/, '角色版本不得继续显示字段差异摘要');
const skillModuleSource = readFileSync(join(process.cwd(), 'src/尘史使徒/UI/components/role/SkillModule.vue'), 'utf8');
assert.match(
  skillModuleSource,
  /const activate = name => \{[\s\S]*activeSkill\.value = name;/,
  '技能卡聚焦不得切换退出编辑态',
);
const inventoryModuleSource = readFileSync(
  join(process.cwd(), 'src/尘史使徒/UI/components/role/InventoryModule.vue'),
  'utf8',
);
assert.match(inventoryModuleSource, /isolation: isolate/, '物品模块必须建立独立层叠上下文');
assert.match(inventoryModuleSource, /z-index: 1 !important/, '工坊内嵌物品详情不得保留全屏遮罩层级');
const artEditorSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/ArtLevelEditor.vue'), 'utf8');
assert.match(artEditorSource, /\['灯', '铸', '刃', '冬', '心', '杯', '蛾', '启'\]/, '术之类型必须严格限定为八性相');
assert.match(artEditorSource, /if \(level === 0\) delete next\[art\]/, '零级性相不得写入角色 JSON');
const itemDetailSource = readFileSync(
  join(process.cwd(), 'src/尘史使徒/UI/components/common/ItemDetailPanel.vue'),
  'utf8',
);
assert.match(itemDetailSource, /\['器具', '药食', '证明', '秘传', '仪式', '杂物'\]/, '物品类型必须使用严格枚举');
assert.match(itemDetailSource, /\['遗片', '佚存', '残卷', '蛀损', '完帙', '未知'\]/, '秘传与仪式必须使用专用品质枚举');
const vitalsSource = structuredClone(source);
vitalsSource.registries.角色.vitals = {
  author: 'a',
  desc: 'd',
  key: 'vitals',
  type: '主要角色',
  data: { 生命状态: { 生命: { 当前: 1, 最大值: 10 }, 体力: { 当前: 2, 最大值: 20 }, 精神: { 当前: 3, 最大值: 30 } } },
} as never;
syncRoleVitalsToMaximum(vitalsSource);
assert.deepEqual((vitalsSource.registries.角色.vitals.data as any).生命状态, {
  生命: { 当前: 10, 最大值: 10 },
  体力: { 当前: 20, 最大值: 20 },
  精神: { 当前: 30, 最大值: 30 },
});
const enumSource = structuredClone(vitalsSource);
(enumSource.registries.角色.vitals.data as any).术之等级 = {
  灯: { 等级: 1, 经验: 0 },
  杯: { 等级: 0, 经验: 20 },
  秘史: { 等级: 3, 经验: 0 },
};
(enumSource.registries.角色.vitals.data as any).物品 = {
  秘典: { 类型: '秘传', 品质: '珍品' },
  仪式: { 类型: '仪式', 品质: '残卷' },
  未知仪式: { 类型: '仪式', 品质: '未知' },
  怪东西: { 类型: '武器', 品质: '传奇' },
};
normalizeRoleEnums(enumSource);
assert.deepEqual((enumSource.registries.角色.vitals.data as any).术之等级, { 灯: { 等级: 1, 经验: 0 } });
assert.equal((enumSource.registries.角色.vitals.data as any).物品.秘典.品质, '遗片');
assert.equal((enumSource.registries.角色.vitals.data as any).物品.仪式.品质, '残卷');
assert.equal((enumSource.registries.角色.vitals.data as any).物品.未知仪式.品质, '未知');
assert.deepEqual((enumSource.registries.角色.vitals.data as any).物品.怪东西, { 类型: '杂物', 品质: '凡庸' });
const creationRelationsSource = readFileSync(
  join(process.cwd(), 'src/尘史使徒/UI/components/start/CreationRelations.vue'),
  'utf8',
);
assert.match(creationRelationsSource, /<RelationshipTargetSelector/, '人物创建必须迁移到公共关系对象选择器');

const betaDir = process.argv[2];
if (betaDir) {
  const entries = Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({
    name,
    content: readFileSync(join(betaDir, `${category}.json`), 'utf8'),
  }));
  const beta = parseScenarioSourceEntries(entries);
  assert.deepEqual(serializeScenarioSource(beta), beta, '当前格式数据应无损往返');
}
console.info('创意工坊定向验证通过：嵌套地图、共享资源同步、旧格式拒绝、v2 包往返、引用、冲突与复制重映射。');
