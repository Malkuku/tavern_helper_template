import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  deleteAsset,
  findReferenceIssues,
  normalizeRoleSelection,
  normalizeRoleEnums,
  normalizeScenarioAvailability,
  syncRoleVitalsToMaximum,
} from '../src/创意工坊/assets/model';
import {
  createPackage,
  expandPackageSelection,
  listConflicts,
  mergePackage,
  parseMapJson,
  parsePackage,
  parseScenarioJson,
} from '../src/创意工坊/assets/package';
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
import { buildMapGenerationPrompt, parseGeneratedMap } from '../src/创意工坊/assets/mapGenerator';
import { serializeScenarioSource } from '../src/创意工坊/assets/repository';
import {
  parseScenarioSourceEntries,
  scenarioWorldbookEntryNames,
  synchronizeAutomaticReferences,
} from '../src/创意工坊/scenario/worldbookSource';
import type { ScenarioSourceBundle } from '../src/创意工坊/scenario/types';
import { mapSvgDisplaySize, renderMapSvg, sanitizeMapSvg } from '../src/创意工坊/scenario/map';
import { scenarioThemes } from '../src/创意工坊/scenario/themes';
import { layoutMapNodes } from '../src/尘史使徒/UI/components/map/layout';
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
assert.match(workspaceSource, /parseScenarioJson\(text\)/, '剧本工作台必须支持纯 JSON 导入');
assert.match(workspaceSource, /downloadScenarioJson\(entry\.value\)/, '剧本工作台必须以纯 JSON 导出当前剧本');
assert.match(
  workspaceSource,
  /class="entry-actions"[\s\S]{0,500}class="scenario-json-actions"/,
  '覆盖导入必须位于当前剧本对象操作区',
);
assert.match(workspaceSource, />导入 JSON<\/button[\s\S]{0,100}>导出 JSON<\/button/, 'JSON 往返入口必须使用同级按钮');
assert.doesNotMatch(workspaceSource, /覆盖导入 JSON/, '覆盖风险应在确认弹窗说明，不应塞进入口名称');
assert.doesNotMatch(
  workspaceSource.match(/<div class="catalog-actions">[\s\S]+?<\/div>/)?.[0] ?? '',
  /importScenarioFile|覆盖导入/,
  '资源目录的新建区不得混入覆盖导入',
);
assert.match(
  workspaceSource,
  /props\.draft\.scenarios\[pending\.targetId\] = pending\.value/,
  '剧本 JSON 导入必须覆盖当前 UUID 对应的草稿',
);
assert.doesNotMatch(
  workspaceSource.match(/async function importScenarioFile[\s\S]+?function confirmScenarioImport/)?.[0] ?? '',
  /crypto\.randomUUID/,
  '覆盖导入不得创建新的剧本 UUID',
);
const userWorkspaceSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/UserWorkspace.vue'), 'utf8');
assert.match(
  userWorkspaceSource,
  /expandPackageSelection\(props\.source, selectedAssets\(\)\)/,
  '导出选择器必须投影权威依赖闭包',
);
assert.match(userWorkspaceSource, /随剧本关联/, '自动依赖必须向用户显示关联状态');
const scenarioEditorSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/ScenarioEditor.vue'), 'utf8');
assert.doesNotMatch(scenarioEditorSource, /type="checkbox"/, '剧本布尔设置不得退回原生勾选框');
assert.match(scenarioEditorSource, /aria-pressed/, '剧本双态选择必须暴露明确的选中状态');
assert.match(scenarioEditorSource, /（当前）/, '剧本双态选择必须用文字标明当前值');
assert.match(scenarioEditorSource, /<CharPanel[^>]+mode="view"/, '剧本角色阵容必须复用只读角色档案预览');
assert.match(
  scenarioEditorSource,
  /class="hero-icon"><ScenarioThemeIcon :theme-id="entry\.视觉方案"/,
  '剧本标题区必须复用共享主题图标的真实配色',
);
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
const rolePickerSource = readFileSync(join(process.cwd(), 'src/创意工坊/components/RolePickerDialog.vue'), 'utf8');
assert.match(rolePickerSource, /@container \(max-width: 960px\)/, '角色阵容选择器必须按弹窗实际宽度重排');
assert.match(
  rolePickerSource,
  /grid-template-rows: minmax\(190px, 40%\) minmax\(0, 1fr\)/,
  '中等宽度下身份列表与角色详情必须各自保有空间',
);
assert.doesNotMatch(
  rolePickerSource,
  /<button[^>]*class="identity-card"/,
  '角色身份卡不得使用会被宿主样式压缩的原生按钮',
);
assert.doesNotMatch(
  rolePickerSource,
  /<button[^>]*class="version-card"/,
  '角色版本卡不得使用会被宿主样式压缩的原生按钮',
);
assert.match(rolePickerSource, /class="identity-card"[\s\S]{0,180}role="button"/, '角色身份卡必须保留可访问交互语义');
assert.match(rolePickerSource, /class="version-card"[\s\S]{0,180}role="button"/, '角色版本卡必须保留可访问交互语义');
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
const safeMapSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21V9l9-6 9 6v12Z"/></svg>';
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
        世界: { 时间: '午后', 地图索引: '城市' },
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
    地图: {
      map: {
        author: 'a',
        desc: '',
        data: { 城市: { 描述: '城', 详情: [], 图标: safeMapSvg, 方位: { x: [0, 0], y: [0, 0], z: [0, 0] } } },
      },
    },
    季节与节日: {},
    种族: {},
    角色: { role: { ...entry, type: 'user' } },
  },
};
assert.deepEqual(findReferenceIssues(source), []);
assert.equal(sanitizeMapSvg(`  ${safeMapSvg}  `), safeMapSvg, '合法 SVG 应净化并保留完整标记');
const namespacedSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M4.9 19.1L19.1 4.9"/></svg>';
assert.equal(sanitizeMapSvg(namespacedSvg), namespacedSvg, '标准 SVG xmlns 不应被外部 URL 规则误判');
assert.deepEqual(
  mapSvgDisplaySize('<svg viewBox="0 0 24 24" width="24" height="24"><path d="M0 0"/></svg>'),
  { width: 24, height: 24, aspectRatio: 1 },
  '普通节点必须读取 24×24 显示尺寸',
);
assert.deepEqual(
  mapSvgDisplaySize('<svg viewBox="0 0 20 32" width="32" height="58"><path d="M0 0"/></svg>'),
  { width: 32, height: 58, aspectRatio: 20 / 32 },
  '纵向节点必须保留 32×58 长宽比',
);
assert.deepEqual(
  mapSvgDisplaySize('<svg viewBox="0 0 32 18" width="58" height="24"><path d="M0 0"/></svg>'),
  { width: 58, height: 24, aspectRatio: 32 / 18 },
  '横向节点必须保留 58×24 长宽比',
);
assert.deepEqual(
  mapSvgDisplaySize(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M0 0"/></svg>',
  ),
  { aspectRatio: 1 },
  'stroke-width 不得被误判为 width；未声明显示尺寸时只保留 viewBox 比例',
);
assert.deepEqual(
  mapSvgDisplaySize('<svg viewBox="0 0 32 18"><path d="M0 0"/></svg>'),
  { aspectRatio: 32 / 18 },
  '未声明尺寸的横向 SVG 不得把 viewBox 内部坐标当成 CSS 像素',
);
const ordinaryLayout = layoutMapNodes(
  [
    { key: 'west', x: 0, y: 0, z: 0, width: 20, height: 20 },
    { key: 'east', x: 100, y: 0, z: 0, width: 20, height: 20 },
  ],
  { coordinateScale: 1, iconScale: 1 },
);
assert.equal(ordinaryLayout.find(node => node.key === 'west')?.visualX, 0, '无碰撞节点不得产生额外位移');
assert.equal(ordinaryLayout.find(node => node.key === 'east')?.visualX, 100, '正常距离应保留原始相对位置');
const crowdedLayout = layoutMapNodes(
  [
    { key: 'west', x: 0, y: 0, z: 0, width: 80, height: 40 },
    { key: 'east', x: 10, y: 0, z: 0, width: 80, height: 40 },
  ],
  { coordinateScale: 1, iconScale: 1 },
);
assert.ok(
  crowdedLayout.find(node => node.key === 'east')!.visualX - crowdedLayout.find(node => node.key === 'west')!.visualX >=
    90,
  '相邻大型 SVG 必须沿原始东西方向撑开到安全距离',
);
const stackedLayout = layoutMapNodes(
  [
    { key: 'hill', x: 0, y: 0, z: 0, width: 40, height: 40 },
    { key: 'palace', x: 0, y: 0, z: 10, width: 40, height: 40 },
  ],
  { coordinateScale: 1, iconScale: 1 },
);
assert.ok(
  stackedLayout.find(node => node.key === 'palace')!.visualY < stackedLayout.find(node => node.key === 'hill')!.visualY,
  '同 x/y 节点必须按 z 将高处节点稳定地向屏幕上方分开',
);
const closeAtOverview = layoutMapNodes(
    [
      { key: 'a', x: 0, y: 0, z: 0, width: 40, height: 40 },
      { key: 'b', x: 20, y: 0, z: 0, width: 40, height: 40 },
    ],
    { coordinateScale: 1, iconScale: 1 },
  ),
  enlargedAtZoom = layoutMapNodes(
    [
      { key: 'a', x: 0, y: 0, z: 0, width: 40, height: 40 },
      { key: 'b', x: 20, y: 0, z: 0, width: 40, height: 40 },
    ],
    { coordinateScale: 4, iconScale: 4 },
  );
assert.ok(Math.abs(closeAtOverview[0].visualX - closeAtOverview[0].x) > 0, '概览尺度的近距节点必须避免重叠');
assert.equal(enlargedAtZoom[0].renderWidth, 160, '地图放大时图标必须随平面坐标倍率同步放大');
assert.throws(
  () => sanitizeMapSvg('<svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"><path d="M0 0"/></svg>'),
  /标准 SVG 命名空间/,
  '被 Markdown 链接污染的 xmlns 必须给出明确错误',
);
assert.throws(
  () => sanitizeMapSvg('<svg xmlns="https://evil.example/svg"><path d="M0 0"/></svg>'),
  /标准 SVG 命名空间/,
  '非标准 xmlns 仍必须拒绝',
);
const multicolorSvg =
  '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#243B55" stroke="#D4AF37"/><path d="M7 13l3 3 7-8" stroke="#F7E7A9" stroke-width="2"/></svg>';
assert.equal(sanitizeMapSvg(multicolorSvg), multicolorSvg, '安全的多色 SVG 必须保持原始 JSON 表示');
const renderedMulticolorSvg = renderMapSvg(multicolorSvg);
assert.match(renderedMulticolorSvg, /fill:#243B55 !important/, '节点填色必须以内联 important 抵抗宿主样式');
assert.match(renderedMulticolorSvg, /stroke:#D4AF37 !important/, '节点描边色必须以内联 important 抵抗宿主样式');
assert.match(renderedMulticolorSvg, /stroke:#F7E7A9 !important/, '不同图形元素必须允许各自着色');
const renderedDefaultSvg = renderMapSvg(
  '<svg viewBox="0 0 126 82" stroke-width="1.2"><path d="M6 14h30"/><circle cx="47" cy="50" r="4"/></svg>',
);
assert.match(renderedDefaultSvg, /<svg[^>]*style="[^"]*fill:none !important/, 'SVG 根节点必须提供默认无填充');
assert.match(renderedDefaultSvg, /<svg[^>]*style="[^"]*stroke:currentColor !important/, 'SVG 根节点必须提供继承色描边');
assert.match(renderedDefaultSvg, /<svg[^>]*style="[^"]*stroke-width:1\.2 !important/, 'SVG 根节点必须保留自定义线宽');
assert.doesNotMatch(renderedDefaultSvg, /\/ style=/, '自闭合 SVG 图形追加内联样式后必须保持合法标签顺序');
assert.equal(
  [...renderedDefaultSvg.matchAll(/<(?:path|circle)[^>]*style="([^"]+)"/g)].every(
    match =>
      match[1].includes('fill:inherit !important') &&
      match[1].includes('stroke:inherit !important') &&
      match[1].includes('stroke-width:inherit !important'),
  ),
  true,
  '每个可绘制元素必须以内联 important 继承根节点默认值，抵抗宿主直接元素样式',
);
assert.throws(
  () => sanitizeMapSvg('<svg viewBox="0 0 24 24"><path fill="url(https://evil.example/a)" d="M0 0"/></svg>'),
  '颜色属性不得借 URL 绕过外部资源限制',
);
for (const maliciousSvg of [
  '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
  '<svg viewBox="0 0 24 24" onload="alert(1)"><path d="M0 0"/></svg>',
  '<svg viewBox="0 0 24 24"><foreignObject><div>bad</div></foreignObject></svg>',
  '<svg viewBox="0 0 24 24"><image href="https://evil.example/a.svg"/></svg>',
  '<svg viewBox="0 0 24 24"><path style="fill:url(javascript:alert(1))" d="M0 0"/></svg>',
]) {
  assert.throws(() => sanitizeMapSvg(maliciousSvg), '恶意 SVG 必须被安全边界拒绝');
  assert.throws(
    () =>
      parseMapJson(
        JSON.stringify({
          author: 'x',
          desc: 'bad',
          data: { 恶意节点: { 描述: '', 详情: [], 图标: maliciousSvg, 方位: { x: [], y: [], z: [] } } },
        }),
      ),
    /安全的完整 SVG/,
    '恶意 SVG 地图导入必须失败',
  );
}
assert.throws(
  () =>
    parseMapJson(
      JSON.stringify({
        author: 'x',
        desc: '字段诊断',
        data: { 城市: { 描述: '缺少字段' } },
      }),
    ),
  /data\.城市\.详情[\s\S]*data\.城市\.图标[\s\S]*data\.城市\.方位/,
  '地图导入失败必须报告具体字段路径，而不是合并成无信息错误',
);
const mapRoundTrip = parseMapJson(JSON.stringify(source.registries.地图.map));
assert.deepEqual(mapRoundTrip, source.registries.地图.map, '完整 MapEntry JSON 必须无损往返');
const invalidCoordinateMap = structuredClone(source.registries.地图.map);
invalidCoordinateMap.data.城市.方位.x = [0] as unknown as [number, number];
assert.throws(
  () => parseMapJson(JSON.stringify(invalidCoordinateMap)),
  /data\.城市\.方位\.x/,
  '地图方位的每个轴都必须严格使用 [min,max] 二元组',
);
assert.deepEqual(
  parseGeneratedMap(`\`\`\`json\n${JSON.stringify(source.registries.地图.map)}\n\`\`\``),
  source.registries.地图.map,
  'AI 地图导入应接受纯 JSON 或 JSON 代码围栏',
);
const mapGenerationPrompt = buildMapGenerationPrompt('设计一张多层港城地图', '图标采用克制的铜蓝双色');
assert.match(mapGenerationPrompt, /author：[\s\S]*desc：[\s\S]*data：/, '地图提示词必须解释 MapEntry 顶层字段');
assert.match(
  mapGenerationPrompt,
  /名称检索词[\s\S]*描述[\s\S]*详情[\s\S]*图标[\s\S]*方位[\s\S]*子地图/,
  '地图提示词必须覆盖全部节点字段',
);
assert.match(
  mapGenerationPrompt,
  /区间两端的平均值[\s\S]*东（x）、北（y）、上（z）[\s\S]*1 km[\s\S]*当前父节点/,
  '地图提示词必须解释坐标的真实渲染语义',
);
assert.match(
  mapGenerationPrompt,
  /自包含 HTML[\s\S]*等待用户确认[\s\S]*最终回复只输出一个合法、完整的 MapEntry JSON/,
  '地图提示词必须将 HTML 方案审阅与最终 JSON 交付分阶段',
);
assert.match(mapGenerationPrompt, /禁止 script、style、foreignObject、image、use/, '地图提示词必须说明 SVG 安全边界');
assert.match(
  mapGenerationPrompt,
  /xmlns 只能写在 svg 根标签[\s\S]*不要把它转换成 Markdown 链接/,
  '地图提示词必须防止 AI 污染标准命名空间',
);
assert.match(
  mapGenerationPrompt,
  /横向、纵向或方形 viewBox[\s\S]*不要在 SVG 中重复输出这三个默认属性/,
  '地图提示词必须采用新版异形线稿，并省略组件已提供的默认 SVG 属性',
);
const mapSvgIconSource = readFileSync(join(process.cwd(), 'src/尘史使徒/UI/components/map/MapSvgIcon.vue'), 'utf8');
assert.doesNotMatch(mapSvgIconSource, /(?:fill|stroke):[^;]+!important/, '地图 SVG 默认呈现不得依赖 scoped CSS 穿透');
const editingMapPrompt = buildMapGenerationPrompt('只重构港口图标', '', source.registries.地图.map);
assert.match(editingMapPrompt, /当前完整 MapEntry JSON/, '地图修改提示词必须携带当前地图基线');
assert.match(editingMapPrompt, /只改动用户点名的范围/, '地图修改提示词必须保护未点名内容');
assert.throws(() => buildMapGenerationPrompt('  ', ''), /请先填写地图创意或修改要求/);
assert.throws(
  () =>
    parseGeneratedMap(
      JSON.stringify({
        author: 'x',
        desc: 'bad',
        data: {
          恶意节点: { 描述: '', 详情: [], 图标: '<svg onload="alert(1)"></svg>', 方位: { x: [], y: [], z: [] } },
        },
      }),
    ),
  /安全的完整 SVG/,
  'AI 地图导入必须复用 SVG 安全边界',
);
assert.throws(
  () =>
    parseMapJson(
      JSON.stringify({
        author: 'x',
        desc: '',
        data: { 城市: { 描述: '', 详情: [], 图标: 'city', 方位: { x: [], y: [], z: [] } } },
      }),
    ),
  /安全的完整 SVG/,
  '旧图标枚举不得继续作为地图输入',
);
const sharedMapExplorer = readFileSync(join(process.cwd(), 'src/尘史使徒/UI/components/map/MapExplorer.vue'), 'utf8');
const developerWorkspace = readFileSync(join(process.cwd(), 'src/创意工坊/components/DeveloperWorkspace.vue'), 'utf8');
assert.match(developerWorkspace, /pendingScenarioImport\?\.category/, 'JSON 覆盖确认弹窗必须按资源类型显示标题');
assert.match(developerWorkspace, /title="JSON 导入失败"/, 'JSON 文件导入失败必须在当前操作上下文显示错误弹窗');
assert.match(developerWorkspace, /pending\.category === '地图'/, '确认导入不得依赖用户之后可能切换的当前领域');
const sharedMapIcon = readFileSync(join(process.cwd(), 'src/尘史使徒/UI/components/map/MapSvgIcon.vue'), 'utf8');
const fullscreenMapDialog = readFileSync(
  join(process.cwd(), 'src/尘史使徒/UI/components/map/MapFullscreenDialog.vue'),
  'utf8',
);
assert.match(
  readFileSync(join(process.cwd(), 'src/尘史使徒/UI/view/世界信息.vue'), 'utf8'),
  /MapExplorer/,
  '尘史运行时必须复用共享地图入口',
);
for (const consumer of [
  'src/创意工坊/components/MapLocationPicker.vue',
  'src/创意工坊/components/MapAssetEditor.vue',
]) {
  assert.match(
    readFileSync(join(process.cwd(), consumer), 'utf8'),
    /MapFullscreenDialog/,
    `${consumer} 必须通过共享全屏地图入口预览`,
  );
}
assert.doesNotMatch(fullscreenMapDialog, /<Teleport\b/, '全屏地图必须沿用工坊现有的当前 Vue 树挂载方式');
assert.match(fullscreenMapDialog, /position: fixed !important/, '全屏地图必须覆盖完整视口');
assert.match(fullscreenMapDialog, /width: 100vw !important/, '全屏地图必须使用完整视口宽度');
assert.match(fullscreenMapDialog, /height: 100dvh !important/, '全屏地图必须使用完整视口高度');
assert.match(sharedMapExplorer, /mode === 'selection'/, '共享地图必须提供地点选择模式');
assert.match(sharedMapExplorer, /mode === 'gameplay'/, '共享地图必须提供运行时模式');
assert.doesNotMatch(sharedMapExplorer, /class="icon"/, '地图节点不得使用易被宿主污染的通用 icon 类');
assert.doesNotMatch(sharedMapExplorer, /\.node span\s*\{/, '节点标签样式不得误伤 SVG 图标容器');
assert.match(sharedMapExplorer, /\.node > \.node-label\s*\{/, '节点标签必须使用明确的直系类边界');
assert.match(sharedMapExplorer, /iconSize\?: number/, '共享地图必须允许调整节点图标尺寸');
assert.match(sharedMapExplorer, /--map-svg-width[\s\S]*--map-svg-height/, '节点容器必须消费 SVG 声明的独立宽高');
assert.match(sharedMapExplorer, /\.grid\s*\{[^}]*pointer-events:\s*none/s, '地图装饰网格不得截获负深度节点的点击');
assert.match(
  sharedMapExplorer,
  /coordinateScale: baseScale\.value \* transform\.k, iconScale: transform\.k/,
  '节点图标必须随地图平面倍率同步缩放',
);
assert.match(
  sharedMapExplorer,
  /x: node\.displayX,[\s\S]*y: -node\.displayY/,
  '地图投影必须使用屏幕向右为正东、屏幕向上为正北的坐标系',
);
assert.match(sharedMapExplorer, /E:.*displayX.*km N:.*displayY.*km/, '地点详情必须按 E:x、N:y 展示公里坐标');
assert.match(sharedMapExplorer, /class="detail"[\s\S]*detailIsLeft\(node\)/, '地点详情必须锚定节点并按画面位置换边');
assert.match(
  sharedMapExplorer,
  /class="detail"[\s\S]*@mousedown\.stop[\s\S]*@wheel\.stop[\s\S]*@touchstart\.stop[\s\S]*@touchmove\.stop/,
  '地点详情必须拦截地图拖拽与缩放手势，同时保留自身滚动',
);
assert.match(
  sharedMapExplorer,
  /detailTab === 'summary'[\s\S]*detailTab === 'details'/,
  '地点简介与详细信息必须分 Tab 展示',
);
assert.doesNotMatch(
  sharedMapExplorer,
  /'--map-(?:icon-size|svg-width|svg-height)'[^\n]+undefined/,
  '缺失尺寸时不得用 undefined 内联变量覆盖默认档位',
);
assert.match(sharedMapExplorer, /top: calc\(100% \+ 5px\) !important/, '节点标签必须跟随实际 SVG 下边界定位');
assert.match(
  sharedMapExplorer,
  /transform: translate\(-50%, -50%\) !important/,
  '不同长宽比的 SVG 必须继续以节点坐标为中心锚定',
);
assert.match(
  sharedMapExplorer,
  /iconShape\?: 'none' \| 'circle' \| 'rounded' \| 'square'/,
  '共享地图必须允许调整节点图标外形',
);
assert.match(sharedMapIcon, /renderMapSvg/, '共享地图图标必须通过安全渲染器补齐内联呈现属性');
for (const [selector, rulePattern] of [
  [
    '.search > button',
    /\.search > button\s*\{[^}]*color:[^;}]+!important[^}]*background:[^;}]+!important[^}]*border:[^;}]+!important/s,
  ],
  ['.detail', /\.detail\s*\{[^}]*color:[^;}]+!important[^}]*background:[^;}]+!important[^}]*border:[^;}]+!important/s],
  [
    '.detail footer button',
    /\.detail footer button\s*\{[^}]*color:[^;}]+!important[^}]*background:[^;}]+!important[^}]*border:[^;}]+!important/s,
  ],
  [
    '.detail .primary',
    /\.detail \.primary\s*\{[^}]*color:[^;}]+!important[^}]*background:[^;}]+!important[^}]*border-color:[^;}]+!important/s,
  ],
  [
    '.detail .danger',
    /\.detail \.danger\s*\{[^}]*color:[^;}]+!important[^}]*background:[^;}]+!important[^}]*border-color:[^;}]+!important/s,
  ],
] as const) {
  assert.match(sharedMapExplorer, rulePattern, `${selector} 的关键颜色必须抵抗宿主样式覆盖`);
}
assert.equal(
  existsSync(join(process.cwd(), 'src/尘史使徒/UI/composables/map/useIconSystem.ts')),
  false,
  '旧图标枚举实现必须退出',
);
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
assert.deepEqual(expandPackageSelection(source, { 开场白: ['s'] }), {
  开场白: ['s'],
  地图: ['map'],
  角色: ['role'],
});
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
assert.deepEqual(parseScenarioJson(JSON.stringify(source.scenarios.s)), source.scenarios.s, '纯剧本 JSON 应无损解析');
assert.throws(() => parseScenarioJson(JSON.stringify(pkg)), /完整剧本 JSON/, '资产包不得冒充纯剧本 JSON 导入');
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

const secondMapSource = structuredClone(source);
secondMapSource.registries.地图.other = {
  author: 'b',
  desc: '另一张地图',
  data: { 荒原: { 描述: '荒原', 详情: [], 图标: safeMapSvg, 方位: { x: [1, 1], y: [1, 1], z: [0, 0] } } },
};
secondMapSource.scenarios.s.内容配置.地图 = 'other';
secondMapSource.scenarios.s.内容配置.世界.地图索引 = '荒原';
assert.deepEqual(findReferenceIssues(secondMapSource), [], '多地图注册表必须允许剧本显式绑定任意有效地图');
secondMapSource.scenarios.s.内容配置.地图 = 'map';
assert.ok(
  findReferenceIssues(secondMapSource).some(issue => issue.field === '世界.地图索引'),
  '更换地图后不得静默保留无效初始地点并宣称可玩',
);
normalizeScenarioAvailability(secondMapSource);
assert.equal(secondMapSource.scenarios.s.可用, false, '初始地点不属于所选地图时必须标记为不可玩');

const mapConflictTarget = structuredClone(source);
mapConflictTarget.registries.地图.map.desc = '本地冲突地图';
const remappedPackage = mergePackage(mapConflictTarget, pkg, { '地图:map': 'copy' });
const copiedMapId = Object.keys(remappedPackage.registries.地图).find(id => id !== 'map');
assert.ok(copiedMapId, '地图冲突选择复制时必须创建新 UUID');
assert.equal(remappedPackage.scenarios.s.内容配置.地图, copiedMapId, '地图复制后剧本单例引用必须重映射');
assert.equal(remappedPackage.scenarios.s.内容配置.世界.地图索引, '城市', '重映射不得篡改有效初始地点');

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
