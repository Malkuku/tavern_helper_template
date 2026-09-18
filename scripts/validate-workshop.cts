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
  defaultRoleData,
  diffSources,
  previewPackage,
  workshopCategories,
} from '../src/创意工坊/assets/presentation';
import {
  buildRoleGenerationPrompt,
  parseGeneratedRole,
  parseRoleRuntimeJson,
  roleGenerationMap,
  roleToRuntimeJson,
} from '../src/创意工坊/assets/roleGenerator';
import { serializeScenarioSource } from '../src/创意工坊/assets/repository';
import {
  parseScenarioSourceEntries,
  scenarioWorldbookEntryNames,
  synchronizeAutomaticReferences,
} from '../src/创意工坊/scenario/worldbookSource';
import type { ScenarioSourceBundle } from '../src/创意工坊/scenario/types';
import { scenarioThemes } from '../src/创意工坊/scenario/themes';
import { resolveSpeaker } from '../src/尘史使徒/UI/components/panel/speaker';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
assert.deepEqual(
  scenarioThemes.map(theme => theme.id),
  ['灯', '铸', '刃', '冬', '心', '杯', '蛾', '启', '破镜', '秘月', '六芒星', '蠕虫', '林地', '白骨门'],
);
assert.deepEqual(
  scenarioThemes.map(theme => theme.className),
  [
    'theme-lamp',
    'theme-forge',
    'theme-blade',
    'theme-winter',
    'theme-heart',
    'theme-cup',
    'theme-moth',
    'theme-key',
    'theme-broken-mirror',
    'theme-secret-moon',
    'theme-hexagram',
    'theme-worm',
    'theme-woodland',
    'theme-bone-gate',
  ],
);
for (const file of [
  'src/创意工坊/components/ScenarioEditor.vue',
  'src/尘史使徒/UI/view/开场设置.vue',
  'src/尘史使徒/UI/view/设置.vue',
]) {
  const sourceText = readFileSync(join(process.cwd(), file), 'utf8');
  assert.match(sourceText, /ScenarioVisualCard/, `${file} 必须复用共享剧本卡`);
  assert.doesNotMatch(
    sourceText,
    /\.theme-(lamp|forge|blade|winter|heart|cup|moth|key|broken-mirror)\s*\{/,
    `${file} 不得复制主题样式`,
  );
}
const themeIconSource = readFileSync(
  join(process.cwd(), 'src/尘史使徒/UI/components/scenario/ScenarioThemeIcon.vue'),
  'utf8',
);
assert.doesNotMatch(themeIconSource, /available|availability/, '共享主题图标不得携带可玩状态徽标');
const workspaceSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/DeveloperWorkspace.vue'), 'utf8');
assert.match(workspaceSource, /scenario-availability/, '剧本资源侧栏必须展示可玩状态徽标');
assert.doesNotMatch(workspaceSource, /<CharPanel[^>]+mode="view"/, '角色资源侧栏不得错误承载阵容预览');
const scenarioEditorSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/ScenarioEditor.vue'), 'utf8');
assert.doesNotMatch(scenarioEditorSource, /type="checkbox"/, '剧本布尔设置不得退回原生勾选框');
assert.match(scenarioEditorSource, /aria-pressed/, '剧本双态选择必须暴露明确的选中状态');
assert.match(scenarioEditorSource, /（当前）/, '剧本双态选择必须用文字标明当前值');
assert.match(scenarioEditorSource, /<CharPanel[^>]+mode="view"/, '剧本角色阵容必须复用只读角色档案预览');
assert.match(
  scenarioEditorSource,
  /role\.entry\.author[\s\S]+role\.entry\.desc/,
  '剧本角色阵容副字段必须使用作者与素材说明',
);
const mainlineComposerSource = readFileSync(
  join(process.cwd(), 'src/创意工坊/components/MainlineComposer.vue'),
  'utf8',
);
assert.match(mainlineComposerSource, /klona\(toRaw\(props\.modelValue\)\)/, '主线更新必须安全克隆 Vue 响应式数据');
assert.doesNotMatch(mainlineComposerSource, /structuredClone/, '主线编辑器不得直接 structuredClone Vue 响应式值');
const jsonBlockEditorSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/JsonBlockEditor.vue'), 'utf8');
assert.doesNotMatch(jsonBlockEditorSource, /<button(?![^>]*type="button")/, 'JSON 编辑操作不得触发宿主表单提交');
const speakers = {
  user: { 姓名: '同名', key: 'user', 名称检索词: ['$all'], meta: { color: '#111111' } },
  主要角色: { 同名: { 姓名: '同名', 名称检索词: ['别名'], meta: { color: '#222222' } } },
  次要角色: { 小明: { 姓名: '小明', meta: { color: '#333333' } } },
};
assert.equal(resolveSpeaker(speakers, '同名', '酒馆用户').color, '#111111', '跨类型同名必须优先 user');
assert.equal(resolveSpeaker(speakers, '酒馆用户', '酒馆用户').color, '#111111');
assert.equal(resolveSpeaker(speakers, '小明', '酒馆用户').color, '#333333');
assert.equal(resolveSpeaker(speakers, '别名', '酒馆用户').color, '#C9B485', '名称检索词不得匹配气泡');
assert.equal(resolveSpeaker(speakers, '小', '酒馆用户').color, '#C9B485', '姓名子串不得匹配气泡');
const lunaSpeakers = {
  主要角色: {
    露娜: { 姓名: '露娜', meta: { avatar: '/luna.webp', color: '#445566', avatarStyle: '5' } },
    希尔: { 姓名: '希尔', meta: { avatar: '/stale-hill.webp', color: '#000000', avatarStyle: '0' } },
  },
};
assert.deepEqual(resolveSpeaker(lunaSpeakers, '希尔', ''), {
  fixedName: '希尔·菲诺尔',
  avatarUrl: 'https://gitgud.io/mouse789/dust-laden-obdurant/-/raw/main/头像/希尔.webp',
  color: '#A8B9CC',
  avatarStyle: 'auto',
});
const entry = { author: 'a', desc: 'd', key: 'k', data: {} };
const source: ScenarioSourceBundle = {
  fixedData: {},
  scenarios: {
    s: {
      author: 'a',
      key: 's',
      desc: '',
      可用: true,
      视觉方案: '灯',
      自定义主角: false,
      内容配置: {
        开场文本: 'text',
        世界: { 时间: '午后' },
        角色: ['role'],
        地图: 'map',
        世界经济: [],
        季节与节日: [],
        势力: [],
        种族: [],
        主线: { 第一幕: { 描述: '开始', 警惕度: 0, 详细: [], 已交融的魂质: [] } },
        任务: [],
        事件: [],
      },
    },
  },
  registries: {
    世界经济: {},
    势力: {},
    地图: { map: { author: 'a', desc: '', data: { 城市: { 描述: '城' } } } },
    季节与节日: {},
    种族: {},
    角色: { role: { ...entry, type: 'user' } },
  },
};
assert.deepEqual(findReferenceIssues(source), []);
const unavailable = structuredClone(source);
unavailable.scenarios.s.内容配置 = {
  开场文本: '',
  世界: {},
  角色: [],
  地图: '',
  世界经济: [],
  季节与节日: [],
  势力: [],
  种族: [],
  主线: {},
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
assert.deepEqual(
  Object.keys(parsedPackage.assets).sort(),
  ['地图', '开场白', '角色'].sort(),
  '选择剧本必须自动包含全部直接依赖',
);
const roleOnlyPackage = createPackage(source, { 角色: ['role'] });
assert.deepEqual(Object.keys(roleOnlyPackage.assets), ['角色'], '独立选择资源不应夹带未引用资产');
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
changed.scenarios.s.内容配置.世界 = { 时间: '夜晚' };
const diff = diffSources(source, changed);
assert.equal(diff.length, 1);
assert.equal(diff[0].fields[0].path, '内容配置.世界.时间');
const preview = previewPackage(target, pkg);
assert.equal(preview.conflicts, 1);
assert.equal(preview.identical, 2);
assert.deepEqual(serializeScenarioSource(source), source, '内存结构应无损往返');
const generatedMainData = defaultRoleData('主要角色');
delete generatedMainData.当前想法;
generatedMainData.姓名 = '雾鸦';
generatedMainData.术之等级 = { 灯: { 等级: 1, 经验: 0 } };
const generatedRole = parseGeneratedRole(
  JSON.stringify({ ...generatedMainData, meta: { avatar: '/user/files/a.webp', color: '#AABBCC' } }),
  '主要角色',
);
assert.equal(generatedRole.data.姓名, '雾鸦');
assert.equal((generatedRole.data.基础数值 as any).力量, 10, '基础数值必须根据术之等级重算');
assert.equal((generatedRole.data.生命状态 as any).生命.当前, 140, '生命状态必须根据术之等级重算并回满');
const generatedUserData = defaultRoleData('user');
assert.equal(
  parseGeneratedRole(JSON.stringify({ ...generatedUserData, 金钱: 12, meta: {} }), 'user').key,
  'user',
  'AI 生成 user 的 key 必须锁定为 user',
);
assert.throws(() => parseGeneratedRole('不是 JSON', '主要角色'), /不是可解析的角色 JSON/);
assert.throws(() => parseGeneratedRole('{"data":{"姓名":"旧包装"}}', '主要角色'), /不要使用工坊资产包装层/);
const runtimeJson = roleToRuntimeJson(generatedRole);
assert.equal(runtimeJson.姓名, '雾鸦');
assert.deepEqual(runtimeJson.meta, generatedRole.meta);
const replacement = parseRoleRuntimeJson(
  JSON.stringify({
    ...generatedMainData,
    姓名: '新雾鸦',
    名称检索词: ['雾鸦', '信使'],
    区域检索词: ['$all'],
    meta: { color: '#112233' },
  }),
  '主要角色',
);
assert.equal(replacement.data.姓名, '新雾鸦');
assert.equal(replacement.meta.color, '#112233');
assert.deepEqual(replacement.data.名称检索词, ['雾鸦', '信使'], '导入不得覆盖手工名称检索词');
assert.deepEqual(replacement.data.区域检索词, ['$all'], '导入不得覆盖手工区域检索词');
assert.throws(
  () => parseRoleRuntimeJson('{"姓名":"残缺角色","meta":{}}', '主要角色'),
  /缺少完整字段/,
  '角色导入不得以默认模板静默补齐残缺数据',
);
assert.throws(
  () =>
    parseRoleRuntimeJson(JSON.stringify({ ...generatedMainData, 姓名: '雾鸦', 非法字段: true, meta: {} }), '主要角色'),
  /不支持的字段/,
);
source.registries.地图.map.data = {
  大陆: {
    名称检索词: ['大陆'],
    描述: '第一层',
    详情: ['保留'],
    图标: 'earth',
    方位: { x: [0], y: [0], z: [0] },
    无用字段: '删除',
    子地图: {
      王国: {
        描述: '第二层',
        详情: ['保留'],
        图标: 'flag',
        方位: { x: [1], y: [1], z: [1] },
        子地图: {
          城市: {
            描述: '第三层',
            详情: ['保留'],
            图标: 'city',
            方位: { x: [2], y: [2], z: [2] },
            子地图: {
              街区: {
                描述: '第四层不应保留',
                详情: ['删除'],
                图标: 'street',
                方位: { x: [3], y: [3], z: [3] },
                子地图: { 店铺: { 描述: '第五层', 详情: [], 图标: 'shop', 方位: { x: [], y: [], z: [] } } },
              },
            },
          },
        },
      },
    },
  },
};
source.registries.种族.race = { ...entry, type: '类人种', key: '人类', data: ['适应性均衡'] };
const promptMap = roleGenerationMap(source);
assert.equal((promptMap.大陆 as any).描述, '第一层');
assert.equal((promptMap.大陆 as any).子地图.王国.子地图.城市.描述, '第三层');
assert.deepEqual((promptMap.大陆 as any).子地图.王国.子地图.城市.子地图.街区, { 子地图: { 店铺: {} } });
assert.doesNotMatch(JSON.stringify(promptMap), /图标|方位|无用字段|第四层不应保留/);
const generatedPrompt = buildRoleGenerationPrompt('主要角色', '雾中信使', '克制', '规则正文', source);
assert.match(generatedPrompt, /雾中信使/);
assert.doesNotMatch(generatedPrompt, /"registries"|"author"|"内容配置"/, '提示词不得泄漏工坊包装层');
assert.doesNotMatch(generatedPrompt, /当前工坊世界资料|世界经济|季节与节日/, '角色提示词不得注入无关世界资产');
assert.match(generatedPrompt, /世界观中的势力资料（运行态 JSON/, '提示词必须提供纯业务结构的势力资料');
assert.match(generatedPrompt, /世界地图（AI 特供精简 JSON/, '提示词必须提供分层清洗后的地图');
assert.match(generatedPrompt, /"街区": \{[\s\S]*"店铺": \{\}/, '地图第三层以后仍须保留节点层级');
assert.doesNotMatch(generatedPrompt, /第四层不应保留|"图标"|"方位"/, '地图不得泄漏深层详情或无用展示数据');
assert.match(
  generatedPrompt,
  /世界观中的种族资料（运行态 JSON，仅作参考，不限制角色设计）/,
  '提示词必须提供开放参考的种族资料',
);
assert.match(generatedPrompt, /"类人种": \{[\s\S]*"人类": \[/, '种族必须按运行态 type 和 key 投影');
assert.match(generatedPrompt, /八大准则|字段规则与创作参考/, '提示词必须为术与准则规则预留明确分区');
assert.match(generatedPrompt, /名称检索词：[\s\S]*EJS 加载完整角色资料/, '提示词必须解释名称检索词用途');
assert.match(generatedPrompt, /区域检索词：[\s\S]*地图索引/, '提示词必须解释区域检索词用途');
assert.match(generatedPrompt, /"名称检索词": \[\s*"\$all"/s, '新建角色模板必须默认使用 $all');
assert.match(generatedPrompt, /信息不足时只向用户提出/, '提示词必须允许 AI 先访谈再生成');
assert.match(generatedPrompt, /人际关系、性经验：暂时锁定/, '提示词必须禁止 AI 填充复杂关联字段');
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
assert.match(roleEditorSource, /visual-editor-body[\s\S]*<MessageDisplay/, '对话预览必须收进头像主题展开栏');
const messageDisplaySource = readFileSync(
  join(process.cwd(), 'src/尘史使徒/UI/components/panel/MessageDisplay.vue'),
  'utf8',
);
assert.match(messageDisplaySource, /fallbackAvatarSvg\(charInfo\.avatarStyle/, '对话默认头像必须消费 avatarStyle');
assert.match(messageDisplaySource, /--role-theme/, '头像细环和对话引号必须消费角色主题颜色');
assert.match(roleEditorSource, /@media \(max-width: 720px\)/, '角色编辑器必须与移动工作区使用同一断点');
assert.match(
  roleEditorSource,
  /\.identity-preview \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  '移动端角色外观必须切换为可收缩单列',
);
const roleCollectionSource = readFileSync(
  join(process.cwd(), 'src/创意工坊/components/RoleCardCollection.vue'),
  'utf8',
);
assert.match(roleCollectionSource, /@media \(max-width: 720px\)/, '语料集合必须与移动工作区使用同一断点');
assert.match(roleCollectionSource, /\.entry-summary strong[\s\S]*overflow-wrap: anywhere/, '语料场景名必须允许断行');
assert.match(messageDisplaySource, /\.role-main\)[\s\S]*min-width: 0/, '移动对话预览内容必须允许收缩');
const roleAvatarSource = readFileSync(join(process.cwd(), 'src/尘史使徒/UI/components/common/RoleAvatar.vue'), 'utf8');
assert.match(roleAvatarSource, /themeColor/, '共享角色头像必须接收主题颜色');
assert.match(roleAvatarSource, /border: 1px solid var\(--avatar-theme/, '共享角色头像外框必须使用主题颜色');
for (const file of [
  'src/创意工坊/components/DeveloperWorkspace.vue',
  'src/创意工坊/components/RoleEditor.vue',
  'src/创意工坊/components/RolePickerDialog.vue',
  'src/创意工坊/components/ScenarioEditor.vue',
  'src/创意工坊/components/UserWorkspace.vue',
  'src/尘史使徒/UI/components/role/CharPanel.vue',
  'src/尘史使徒/UI/view/角色.vue',
]) {
  const sourceText = readFileSync(join(process.cwd(), file), 'utf8');
  const avatars = sourceText.match(/<RoleAvatar\b[\s\S]*?\/>/g) ?? [];
  assert.ok(avatars.length, `${file} 应包含共享角色头像`);
  assert.ok(
    avatars.every(avatar => avatar.includes(':theme-color=')),
    `${file} 的每个角色头像都必须传入主题色`,
  );
}
const developerWorkspaceSource = readFileSync(
  join(process.cwd(), 'src/创意工坊/components/DeveloperWorkspace.vue'),
  'utf8',
);
const roleGeneratorSource = readFileSync(join(process.cwd(), 'src/创意工坊/assets/roleGenerator.ts'), 'utf8');
for (const ruleName of ['八大准则', '灯', '铸', '刃', '冬', '心', '杯', '蛾', '启', '物品参考表'])
  assert.match(roleGeneratorSource, new RegExp(`['"]${ruleName}['"]`), `角色提示词必须读取${ruleName}`);
assert.match(
  roleGeneratorSource,
  /runtimeCollection\(source\.registries\.势力\)/,
  '势力必须以运行态 JSON 投影进入提示词',
);
assert.match(developerWorkspaceSource, /current\.desc\?\.trim\(\) \|\| '暂无素材说明'/, '角色版本必须显示素材说明');
assert.doesNotMatch(developerWorkspaceSource, /`区别：/, '角色版本不得继续显示字段差异摘要');
assert.match(developerWorkspaceSource, /buildDownloadableRolePrompt/, '外部 AI 流程必须支持拼装并下载提示词');
assert.match(
  developerWorkspaceSource,
  /parseGeneratedRole\(generatorJson\.value/,
  '外部 AI 流程必须支持粘贴 JSON 导入',
);
assert.match(developerWorkspaceSource, /target\.data = parsed\.data/, '外部 AI 流程必须完整覆盖当前角色数据');
assert.match(developerWorkspaceSource, /roleToRuntimeJson\(target\)/, '当前角色必须可导出为 stat_data JSON');
assert.doesNotMatch(developerWorkspaceSource, /generateRaw|generateRoleDraft/, '工坊不得继续直调宿主模型生成角色');
const avatarMediaSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/AvatarMediaField.vue'), 'utf8');
assert.match(avatarMediaSource, /聚焦裁剪头像/, '上传头像必须提供聚焦裁剪');
assert.match(avatarMediaSource, /toDataURL\('image\/png'\)/, '裁剪结果必须写为可持久化 data URL');
assert.doesNotMatch(avatarMediaSource, /getDisplayMedia|截取屏幕/, '头像入口不得继续捕获用户屏幕');
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
