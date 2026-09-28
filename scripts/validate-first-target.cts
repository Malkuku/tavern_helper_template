import assert from 'node:assert/strict';
import { availableCharacterImageForms, characterImageUrl } from '../src/手机界面/apps/data/characterImages';
import {
  assignFirstTarget,
  firstTargetChoices,
  firstTargetKeys,
  firstTargetSystemLog,
  hasDiscoveredRole,
} from '../src/手机界面/apps/data/firstTarget';
import { visibleObservationTargets } from '../src/手机界面/apps/data/observationTargets';
import type { stat_data } from '../src/手机界面/types';

function emptyData(): stat_data {
  return {
    角色: { 主要角色: {}, 次要角色: {}, user: { 物品: {} } },
    系统: { 已发现目标: [] },
    任务: {},
  } as unknown as stat_data;
}

assert.deepEqual(firstTargetKeys, ['鹭见凛', '雨宫雫', '索菲亚', '小鸟游琉璃']);
assert.deepEqual(
  firstTargetChoices.map(choice => choice.item.name),
  ['青叶学园转学生证明', '孤儿院志愿者登记函', '白鹭大学交换生证明', '投资研究助理工作证明'],
);
assert.match(firstTargetChoices[0].quest.goal, /转学生身份进入青叶学园/);
assert.match(firstTargetChoices[0].item.effect, /进入青叶学园/);
assert.match(firstTargetChoices[1].quest.goal, /工作人员同意/);
assert.match(firstTargetChoices[2].quest.goal, /交换生身份参加校园公益活动/);
assert.match(firstTargetChoices[3].quest.goal, /投资研究助理身份参加公开行业活动/);
for (const choice of firstTargetChoices) {
  const key = choice.key;
  const data = emptyData();
  assert.equal(hasDiscoveredRole(data), false);
  assignFirstTarget(data, key);
  assert.equal(hasDiscoveredRole(data), true);
  assert.deepEqual(data.系统.已发现目标, [key]);
  assert.equal(data.任务[`初始接触：${key}`].当前进度, '进行中');
  assert.equal(data.任务[`初始接触：${key}`].描述, choice.quest.description);
  assert.equal(data.任务[`初始接触：${key}`].目标, choice.quest.goal);
  assert.equal(data.角色.user.物品[choice.item.name].数量, 1);
  assert.equal(data.角色.user.物品[choice.item.name].作用, choice.item.effect);
  assert.match(firstTargetSystemLog(key), new RegExp(`领取${choice.item.name}`));
  assert.deepEqual(visibleObservationTargets(data), [{ id: `档案待建立:${key}`, key, kind: '档案待建立' }]);
  assert.throws(() => assignFirstTarget(data, key), /已经有已发现目标/);
}

const hidden = emptyData();
assert.throws(() => assignFirstTarget(hidden, '林沐沐'), /不能作为初始/);
assert.deepEqual(hidden.系统.已发现目标, []);
const full = emptyData();
full.任务 = Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, {}])) as stat_data['任务'];
assert.throws(() => assignFirstTarget(full, '鹭见凛'), /上限/);
assert.deepEqual(full.系统.已发现目标, []);
const existingItem = emptyData();
const rinItem = firstTargetChoices[0].item;
existingItem.角色.user.物品[rinItem.name] = {
  描述: rinItem.description,
  作用: rinItem.effect,
  评级: 'D',
  价格: 0,
  数量: 2,
  耐久: 100,
};
assignFirstTarget(existingItem, '鹭见凛');
assert.equal(existingItem.角色.user.物品[rinItem.name].数量, 3);
const invalidItem = emptyData();
invalidItem.角色.user.物品[rinItem.name] = { ...existingItem.角色.user.物品[rinItem.name], 数量: 0 };
assert.throws(() => assignFirstTarget(invalidItem, '鹭见凛'), /数量无效/);
assert.deepEqual(invalidItem.系统.已发现目标, []);
const conflictingItem = emptyData();
conflictingItem.角色.user.物品[rinItem.name] = {
  ...existingItem.角色.user.物品[rinItem.name],
  描述: '同名但不同规格',
};
assert.throws(() => assignFirstTarget(conflictingItem, '鹭见凛'), /不一致/);
assert.deepEqual(conflictingItem.系统.已发现目标, []);
assert.deepEqual(conflictingItem.任务, {});

const mixed = emptyData();
mixed.系统.已发现目标 = ['索菲亚', '987', '雨宫雫', '未录入'];
mixed.角色.主要角色.索菲亚 = {} as stat_data['角色']['主要角色'][string];
mixed.角色.次要角色['987'] = {} as stat_data['角色']['次要角色'][string];
assert.deepEqual(visibleObservationTargets(mixed), [
  { id: '主要角色:索菲亚', key: '索菲亚', kind: '主要角色' },
  { id: '次要角色:987', key: '987', kind: '次要角色' },
  { id: '档案待建立:雨宫雫', key: '雨宫雫', kind: '档案待建立' },
]);

const stage = (level: number) =>
  ({ 人设阶段: { 恶堕度: { 当前等级: level } } }) as stat_data['角色']['主要角色'][string];
assert.deepEqual(availableCharacterImageForms(stage(3)), ['日常', '魔法少女']);
assert.deepEqual(availableCharacterImageForms(stage(4)), ['日常', '魔法少女', '恶堕']);
assert.equal(characterImageUrl('雨宫雫', '魔法少女', 2)?.includes('2.webp'), true);
assert.equal(characterImageUrl('鹭见凛', '魔法少女', 2), null);
assert.equal(characterImageUrl('未知', '日常'), null);

console.log('first target and image mapping validation passed');
