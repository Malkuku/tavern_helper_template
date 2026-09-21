import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { assembleScenario } from '../src/创意工坊/scenario/assembler';
import { applyScenarioToLatestMessage } from '../src/创意工坊/scenario/hostAdapter';
import { sanitizeMapSvg } from '../src/创意工坊/scenario/map';
import { parseScenarioSourceEntries, scenarioWorldbookEntryNames } from '../src/创意工坊/scenario/worldbookSource';

const configDirectory = process.argv[2];
if (!configDirectory) throw new Error('请传入尘史使徒 Beta 配置目录。');

const readDocument = (filename: string) => JSON.parse(readFileSync(path.join(configDirectory, filename), 'utf8'));

const source = parseScenarioSourceEntries(
  Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({
    name,
    content: JSON.stringify(readDocument(`${category}.json`)),
  })),
);

const scenarioId = Object.entries(source.scenarios).find(
  ([, scenario]: [string, any]) => scenario.key === '被遗忘者',
)?.[0];
assert.ok(scenarioId, '未找到“被遗忘者”开场白');

const cloneSource = () => structuredClone(source);
const countMapNodes = (nodes: Record<string, any>): number =>
  Object.values(nodes).reduce((total, node) => total + 1 + countMapNodes(node.子地图 ?? {}), 0);
const collectMapNodes = (nodes: Record<string, any>): any[] =>
  Object.values(nodes).flatMap((node: any) => [node, ...collectMapNodes(node.子地图 ?? {})]);
const expectCode = (expectedCode: string, mutate: (draft: any) => void) => {
  const draft = cloneSource();
  mutate(draft);
  assert.throws(
    () => assembleScenario(draft, scenarioId),
    (error: any) => error?.code === expectedCode,
    `应抛出 ${expectedCode}`,
  );
};

const result = assembleScenario(source, scenarioId);
assert.equal(result.scenario.key, '被遗忘者');
assert.equal(result.statData.system.当前剧本, '被遗忘者');
assert.equal(Object.hasOwn(result.statData, '术'), false, '运行时数据不应再携带顶层术能力表');
assert.ok(result.openingText.length > 0);
assert.ok(Object.keys(result.statData.角色.主要角色).length > 0);
assert.ok(countMapNodes(result.statData.地图) > 0);
assert.equal(countMapNodes(result.statData.地图), 52, 'Beta 存量地图必须完整迁移 52 个节点');
for (const node of collectMapNodes(result.statData.地图)) {
  assert.equal(sanitizeMapSvg(node.图标), node.图标.trim(), 'Beta 每个地图节点都必须携带安全的完整 SVG');
}
assert.match(
  (result.statData.地图 as any).泰拉大陆.图标,
  /M2 22h20L12 2 2 22zm5-5l5-10 5 10H7z/,
  'Beta 迁移必须保留原“高山”图标 path，不得擅自重画',
);
assert.match(
  (result.statData.地图 as any).泰拉大陆.子地图.埃布尔王国.图标,
  /M2 18h20M4 14l3-8 5 5 5-5 3 8H4z/,
  'Beta 迁移必须保留原“王国”图标 path，不得擅自重画',
);
assert.deepEqual(result.statData.任务, {});
const assembledScenarios = Object.entries(source.scenarios)
  .filter(([, scenario]) => scenario.可用)
  .map(([id]) => assembleScenario(source, id));
assert.equal(Object.keys(source.scenarios).length, 5, '应读取全部 5 个剧本');
assert.equal(assembledScenarios.length, 3, '应能组装全部 3 个标记为可用的剧本');
assert.deepEqual(
  Object.values(source.scenarios).map(item => item.视觉方案),
  ['破镜', '灯', '杯', '蛾', '冬'],
  '五个剧本应使用迁移后的视觉方案',
);

expectCode('RESOURCE_NOT_FOUND', draft => {
  draft.scenarios[scenarioId].内容配置.地图 = 'missing-map';
});
expectCode('RESOURCE_NOT_FOUND', draft => {
  draft.scenarios[scenarioId].内容配置.地图 = '';
});
expectCode('INVALID_MAP_LOCATION', draft => {
  draft.scenarios[scenarioId].内容配置.世界.地图索引 = '不存在的初始地点';
});

{
  const draft = cloneSource();
  const originalMapId = draft.scenarios[scenarioId].内容配置.地图;
  const secondMapId = 'independent-second-map';
  draft.registries.地图[secondMapId] = structuredClone(draft.registries.地图[originalMapId]);
  draft.registries.地图[secondMapId].desc = '独立第二地图';
  draft.scenarios[scenarioId].内容配置.地图 = secondMapId;
  assert.equal(
    assembleScenario(draft, scenarioId).scenario.内容配置.地图,
    secondMapId,
    '组装器必须按显式 UUID 绑定第二地图',
  );
}

const worldEditIni = readFileSync(path.join(configDirectory, '..', '更新规则', '（配置1）世界编辑任务.ini'), 'utf8');
assert.match(worldEditIni, /完整 SVG 字符串/, '世界编辑规则必须要求完整 SVG');
assert.match(worldEditIni, /SVG 安全子集/, '世界编辑规则必须声明 SVG 安全子集');
assert.match(worldEditIni, /横向、纵向或方形画布/, '世界编辑规则必须采用新版异形地图图标风格');
assert.match(
  worldEditIni,
  /常规线稿不要在 SVG 中重复输出这三个属性/,
  '世界编辑规则必须省略渲染组件已提供的默认 SVG 属性',
);
assert.doesNotMatch(
  worldEditIni,
  /MapIcon|图标[^\r\n]*(?:earth|kingdom|city|village|building|shop|palace|academy|dungeon|forest)/i,
  '世界编辑规则不得保留旧图标枚举契约',
);

{
  const draft = cloneSource();
  const roleIds = draft.scenarios[scenarioId].内容配置.角色.filter(
    (id: string) => draft.registries.角色[id].type === '主要角色',
  );
  draft.registries.角色[roleIds[1]].key = draft.registries.角色[roleIds[0]].key;
  draft.registries.角色[roleIds[0]].data = { 被覆盖: true };
  draft.registries.角色[roleIds[1]].data = { 生效: true };
  assert.throws(
    () => assembleScenario(draft, scenarioId),
    (error: any) => error?.code === 'DUPLICATE_KEY',
    '同一剧本不应接受同角色的多个版本',
  );
}

expectCode('UNKNOWN_ROLE_TYPE', draft => {
  const roleId = draft.scenarios[scenarioId].内容配置.角色.find(
    (id: string) => draft.registries.角色[id].type === '主要角色',
  );
  draft.registries.角色[roleId].type = '未知角色';
});

expectCode('DUPLICATE_USER', draft => {
  const roleId = draft.scenarios[scenarioId].内容配置.角色.find(
    (id: string) => draft.registries.角色[id].type === '主要角色',
  );
  draft.registries.角色[roleId].type = 'user';
});

async function validateHostRollback() {
  const host = globalThis as any;
  const originalMvuData = { stat_data: { marker: 'original' } };
  let currentMvuData = structuredClone(originalMvuData);
  let currentMessage = 'original message';
  let messageWriteCount = 0;

  host.waitGlobalInitialized = async () => undefined;
  host.getLastMessageId = () => 4;
  host.getChatMessages = () => [{ message_id: 4, message: currentMessage }];
  host.Mvu = {
    getMvuData: () => structuredClone(currentMvuData),
    replaceMvuData: async (data: any) => {
      currentMvuData = structuredClone(data);
    },
  };
  host.setChatMessages = async ([message]: any[]) => {
    currentMessage = message.message;
    messageWriteCount += 1;
    if (messageWriteCount === 1) throw new Error('simulated message failure');
  };

  await assert.rejects(
    () => applyScenarioToLatestMessage(result),
    (error: any) => error?.code === 'HOST_APPLY_FAILED',
  );
  assert.deepEqual(currentMvuData, originalMvuData);
  assert.equal(currentMessage, 'original message');
}

validateHostRollback()
  .then(() => {
    console.info(
      `剧本数据验证通过：5 个剧本（${assembledScenarios.length} 个可用），${Object.keys(result.statData.角色.主要角色).length} 个主要角色，${countMapNodes(result.statData.地图)} 个地图节点；宿主失败回滚通过。`,
    );
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
