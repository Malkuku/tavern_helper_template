import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import {
  cloneSource,
  findReferenceIssues,
  normalizeRoleSelection,
  normalizeScenarioAvailability,
  roleIdentityOf,
} from '../src/创意工坊/assets/model';
import { createPackage, listConflicts, mergePackage, parsePackage } from '../src/创意工坊/assets/package';
import { saveScenarioSource } from '../src/创意工坊/assets/repository';
import { addRoleToRuntime, getRuntimeRoles, runtimeRoleExists } from '../src/创意工坊/assets/runtimeRole';
import type { ScenarioSourceBundle, WorkshopPackage } from '../src/创意工坊/scenario/types';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const baseEntry = { author: 'acceptance', desc: 'asset', key: 'key', data: { value: 1 } };
function fixture(): ScenarioSourceBundle {
  return {
    fixedData: {},
    scenarios: {
      scenario: {
        author: 'acceptance',
        key: 'scenario',
        desc: '',
        可用: true,
        视觉方案: '灯',
        自定义主角: false,
        内容配置: {
          开场文本: 'opening',
          世界: {},
          角色: ['role'],
          地图: 'map',
          世界经济: [],
          季节与节日: [],
          势力: [],
          种族: [],
          主线: {},
          任务: [],
          事件: [],
        },
      },
    },
    registries: {
      世界经济: {},
      势力: {},
      地图: { map: { author: 'acceptance', desc: '', data: { 艾斯特拉: { 描述: '城市' } } } },
      季节与节日: {},
      种族: {},
      角色: { role: { ...baseEntry, type: 'user' } },
    },
  };
}

async function testPackageAndReferences(): Promise<void> {
  const source = fixture();
  assert.deepEqual(findReferenceIssues(source), []);

  const missing = cloneSource(source);
  missing.scenarios.scenario.内容配置.地图 = 'missing-map';
  assert.equal(normalizeScenarioAvailability(missing).length, 1);
  assert.equal(missing.scenarios.scenario.可用, false);

  const emptyRequired = cloneSource(source);
  emptyRequired.scenarios.scenario.可用 = true;
  emptyRequired.scenarios.scenario.内容配置.开场文本 = '';
  emptyRequired.scenarios.scenario.内容配置.世界 = {};
  emptyRequired.scenarios.scenario.内容配置.地图 = '';
  emptyRequired.scenarios.scenario.内容配置.主线 = {};
  emptyRequired.scenarios.scenario.内容配置.角色 = [];
  normalizeScenarioAvailability(emptyRequired);
  assert.equal(emptyRequired.scenarios.scenario.可用, false, '必填单例和 user 均缺失时必须归一为不可用');

  const multipleUsers = cloneSource(source);
  multipleUsers.registries.角色.secondUser = { ...baseEntry, key: 'second', type: 'user' };
  multipleUsers.scenarios.scenario.内容配置.角色.push('secondUser');
  assert.ok(normalizeScenarioAvailability(multipleUsers).some(issue => issue.field === '角色.user'));
  assert.equal(multipleUsers.scenarios.scenario.可用, false);

  const selected = createPackage(source, { 开场白: ['scenario'], 角色: ['role'] });
  assert.deepEqual(Object.keys(selected.assets).sort(), ['地图', '开场白', '角色']);
  assert.equal(parsePackage(JSON.stringify(selected)).format, 'dust-history-workshop-package');
  assert.throws(() => parsePackage('{bad json'));
  assert.throws(() => parsePackage(JSON.stringify({ ...selected, version: 1 })));
  assert.throws(() => parsePackage(JSON.stringify({ ...selected, version: 3 })));
  const secondMapPackage: WorkshopPackage = {
    format: 'dust-history-workshop-package',
    version: 2,
    exportedAt: new Date().toISOString(),
    assets: { 地图: { another: { author: '', desc: '', data: {} } } },
  };
  assert.throws(() => listConflicts(source, secondMapPackage), /只允许唯一地图/);
  assert.throws(() => mergePackage(source, secondMapPackage, {}), /只允许唯一地图/);

  const target = fixture();
  target.registries.角色.role.data = { target: true };
  assert.equal(listConflicts(target, selected).length, 1);
  assert.deepEqual(mergePackage(target, selected, { '角色:role': 'skip' }).registries.角色.role.data, { target: true });
  assert.deepEqual(mergePackage(target, selected, { '角色:role': 'overwrite' }).registries.角色.role.data, {
    value: 1,
  });
  const copied = mergePackage(target, selected, { '角色:role': 'copy' });
  const copiedId = Object.keys(copied.registries.角色).find(id => id !== 'role');
  assert.ok(copiedId);
  assert.deepEqual(copied.scenarios.scenario.内容配置.角色, [copiedId]);

  // A skip decision for another conflicting asset must remain authoritative even when one asset is copied.
  const targetWithScenarioConflict = fixture();
  targetWithScenarioConflict.registries.角色.role.data = { target: true };
  targetWithScenarioConflict.scenarios.scenario.desc = 'keep target scenario';
  const mixed = mergePackage(targetWithScenarioConflict, selected, {
    '角色:role': 'copy',
    '开场白:scenario': 'skip',
  });
  assert.equal(mixed.scenarios.scenario.desc, 'keep target scenario');
}

async function testWorldbookTransaction(): Promise<void> {
  const source = fixture();
  const names = [
    '<开场白>配置',
    '<世界>配置',
    '<世界经济>配置',
    '<主线>配置',
    '<事件>配置',
    '<任务>配置',
    '<势力>配置',
    '<地图>配置',
    '<季节与节日>配置',
    '<开场文本>配置',
    '<种族>配置',
    '<角色>配置',
  ];
  const previous = names.map((name, index) => ({ uid: index, name, content: '{}' }));
  (globalThis as any).getCharWorldbookNames = () => ({ primary: 'primary' });
  (globalThis as any).getWorldbook = async () => structuredClone(previous);
  const writes: unknown[] = [];
  (globalThis as any).replaceWorldbook = async (_name: string, entries: unknown) => {
    writes.push(structuredClone(entries));
    if (writes.length === 1) throw new Error('injected write failure');
  };
  await assert.rejects(saveScenarioSource(source), /已恢复/);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], previous);
}

async function testRuntimeRoleTransaction(): Promise<void> {
  const initial = {
    stat_data: {
      角色: { user: {}, 主要角色: { key: { old: true } }, 次要角色: {} },
      system: { 关注角色列表: { 主要角色: ['key'], 次要角色: [] } },
    },
  };
  (globalThis as any).waitGlobalInitialized = async () => {};
  (globalThis as any).getLastMessageId = () => 7;
  const writes: any[] = [];
  const reads: number[] = [];
  let current = structuredClone(initial);
  (globalThis as any).Mvu = {
    getMvuData: ({ message_id }: { message_id: number }) => {
      reads.push(message_id);
      if (message_id !== -1) throw new Error('运行态存在性必须读取最新有效 MVU 状态。');
      return structuredClone(current);
    },
    replaceMvuData: async (value: unknown) => {
      writes.push(structuredClone(value));
      current = structuredClone(value) as typeof initial;
    },
  };
  const role = {
    author: '',
    desc: '',
    key: 'key',
    type: '主要角色',
    meta: { avatar: '/user/files/key.webp', color: '#AABBCC' },
    data: { replacement: true },
  };
  assert.equal(await addRoleToRuntime(role, false), 'conflict');
  assert.deepEqual(reads, [-1]);
  assert.equal(writes.length, 0);
  assert.equal(await addRoleToRuntime(role, true), 'overwritten');
  assert.deepEqual(writes[0].stat_data.角色.主要角色.key, { replacement: true, meta: role.meta });
  assert.deepEqual(writes[0].stat_data.system.关注角色列表, initial.stat_data.system.关注角色列表);

  const snapshot = await getRuntimeRoles();
  assert.deepEqual(Object.keys(snapshot.主要角色), ['key']);
  assert.equal(runtimeRoleExists(snapshot, '主要角色', 'key'), true);
  assert.equal(runtimeRoleExists(snapshot, '次要角色', 'key'), false);
  const user = {
    author: '',
    desc: '',
    key: 'user',
    type: 'user',
    meta: { avatar: '/user/files/user.webp', color: '#112233' },
    data: { name: '新主角' },
  };
  assert.equal(await addRoleToRuntime(user, false), 'added', '空 user 槽必须允许直接加入');
  assert.equal(await addRoleToRuntime(user, false), 'conflict', '已有 user 必须进入替换确认而非并存');
  assert.equal(await addRoleToRuntime(user, true), 'overwritten');
  assert.deepEqual(writes.at(-1).stat_data.角色.user, { name: '新主角', meta: user.meta });

  current = structuredClone(initial);
  writes.length = 0;
  let calls = 0;
  (globalThis as any).Mvu.replaceMvuData = async (value: unknown) => {
    writes.push(structuredClone(value));
    calls += 1;
    if (calls === 1) throw new Error('injected role failure');
  };
  await assert.rejects(addRoleToRuntime({ ...role, key: 'new-key' }, false), /已恢复/);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], initial);
}

function testRoleIdentityGrouping(): void {
  const roles: ScenarioSourceBundle['registries']['角色'] = {
    mainV1: { ...baseEntry, key: 'same', type: '主要角色', data: { version: 1 } },
    mainV2: { ...baseEntry, key: 'same', type: '主要角色', data: { version: 2 } },
    minor: { ...baseEntry, key: 'same', type: '次要角色' },
    userV1: { ...baseEntry, key: 'one', type: 'user' },
    userV2: { ...baseEntry, key: 'two', type: 'user' },
  };
  assert.equal(roleIdentityOf(roles.mainV1), roleIdentityOf(roles.mainV2));
  assert.notEqual(roleIdentityOf(roles.mainV1), roleIdentityOf(roles.minor));
  assert.equal(roleIdentityOf(roles.userV1), roleIdentityOf(roles.userV2));
  assert.deepEqual(normalizeRoleSelection(Object.keys(roles), roles), ['mainV2', 'minor', 'userV2']);
}

async function testDamagedAssetPayload(): Promise<void> {
  const pkg: WorkshopPackage = {
    format: 'dust-history-workshop-package',
    version: 2,
    exportedAt: new Date().toISOString(),
    assets: { 角色: { damaged: { arbitrary: true } } },
  };
  assert.throws(() => parsePackage(JSON.stringify(pkg)), /./);
}

async function main(): Promise<void> {
  const cases = [
    ['资产包与引用', testPackageAndReferences],
    ['世界书事务', testWorldbookTransaction],
    ['运行时角色事务', testRuntimeRoleTransaction],
    ['角色身份与版本互斥', testRoleIdentityGrouping],
    ['损坏资产载荷', testDamagedAssetPayload],
  ] as const;
  const failures: unknown[] = [];
  for (const [name, test] of cases) {
    try {
      await test();
      console.info(`PASS ${name}`);
    } catch (error) {
      failures.push(error);
      console.error(`FAIL ${name}`, error);
    }
  }
  if (failures.length) throw new AggregateError(failures, `${failures.length} 项独立验收失败。`);
  console.info('创意工坊独立验收通过。');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
