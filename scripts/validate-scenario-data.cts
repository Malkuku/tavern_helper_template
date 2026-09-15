import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { assembleScenario } from '../src/创意工坊/scenario/assembler';
import { applyScenarioToLatestMessage } from '../src/创意工坊/scenario/hostAdapter';
import { parseScenarioSourceEntries, scenarioWorldbookEntryNames } from '../src/创意工坊/scenario/worldbookSource';

const configDirectory = process.argv[2];
if (!configDirectory) throw new Error('请传入尘史使徒 Beta 配置目录。');

const readDocument = (filename: string) =>
  JSON.parse(readFileSync(path.join(configDirectory, filename), 'utf8'));

const source = parseScenarioSourceEntries(
  Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({
    name,
    content: JSON.stringify(readDocument(`${category}.json`)),
  })),
);

const scenarioId = Object.entries(source.scenarios).find(([, scenario]: [string, any]) => scenario.key === '被遗忘者')?.[0];
assert.ok(scenarioId, '未找到“被遗忘者”开场白');

const cloneSource = () => structuredClone(source);
const countMapNodes = (nodes: Record<string, any>): number =>
  Object.values(nodes).reduce((total, node) => total + 1 + countMapNodes(node.子地图 ?? {}), 0);
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
assert.ok(result.openingText.length > 0);
assert.ok(Object.keys(result.statData.角色.主要角色).length > 0);
assert.ok(countMapNodes(result.statData.地图) > 0);
assert.deepEqual(result.statData.任务, {});

expectCode('RESOURCE_NOT_FOUND', draft => {
  draft.scenarios[scenarioId].内容配置.世界 = 'missing-world';
});

expectCode('DUPLICATE_KEY', draft => {
  const roleIds = draft.scenarios[scenarioId].内容配置.角色.filter(
    (id: string) => draft.registries.角色[id].type === '主要角色',
  );
  draft.registries.角色[roleIds[1]].key = draft.registries.角色[roleIds[0]].key;
});

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

expectCode('RESOURCE_NOT_FOUND', draft => {
  const mapId = draft.scenarios[scenarioId].内容配置.地图;
  draft.registries.地图[mapId].root = { 'missing-map-node': {} };
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
      `剧本数据验证通过：${result.scenario.key}，${Object.keys(result.statData.角色.主要角色).length} 个主要角色，${countMapNodes(result.statData.地图)} 个地图节点；宿主失败回滚通过。`,
    );
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
