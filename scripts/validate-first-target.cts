import assert from 'node:assert/strict';
import { availableCharacterImageForms, characterImageUrl } from '../src/手机界面/apps/data/characterImages';
import {
  assignFirstTarget,
  firstTargetKeys,
  firstTargetSystemLog,
  firstTargetUserMessage,
  hasDiscoveredRole,
} from '../src/手机界面/apps/data/firstTarget';
import type { stat_data } from '../src/手机界面/types';

function emptyData(): stat_data {
  return {
    角色: { 主要角色: {}, 次要角色: {}, user: { 物品: {} } },
    系统: { 已发现目标: [] },
    任务: {},
  } as unknown as stat_data;
}

assert.deepEqual(firstTargetKeys, ['鹭见凛', '雨宫雫', '索菲亚', '小鸟游琉璃']);
for (const key of firstTargetKeys) {
  const data = emptyData();
  assert.equal(hasDiscoveredRole(data), false);
  assignFirstTarget(data, key);
  assert.equal(hasDiscoveredRole(data), true);
  assert.deepEqual(data.系统.已发现目标, [key]);
  assert.equal(data.任务[`初始接触：${key}`].当前进度, '进行中');
  assert.equal(data.角色.user.物品.伪造身份凭证.数量, 1);
  assert.match(firstTargetSystemLog(key), /<systemLog>[\s\S]*<user>[\s\S]*<\/systemLog>/);
  assert.equal(firstTargetUserMessage(key), `<user>选择了${key}作为第一个恶堕目标`);
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
existingItem.角色.user.物品.伪造身份凭证 = {
  描述: '已有凭证',
  作用: '掩护身份',
  评级: 'D',
  价格: 0,
  数量: 2,
  耐久: 100,
};
assignFirstTarget(existingItem, '鹭见凛');
assert.equal(existingItem.角色.user.物品.伪造身份凭证.数量, 3);
const invalidItem = emptyData();
invalidItem.角色.user.物品.伪造身份凭证 = { ...existingItem.角色.user.物品.伪造身份凭证, 数量: 0 };
assert.throws(() => assignFirstTarget(invalidItem, '鹭见凛'), /数量无效/);
assert.deepEqual(invalidItem.系统.已发现目标, []);

const stage = (level: number) =>
  ({ 人设阶段: { 恶堕度: { 当前等级: level } } }) as stat_data['角色']['主要角色'][string];
assert.deepEqual(availableCharacterImageForms(stage(3)), ['日常', '魔法少女']);
assert.deepEqual(availableCharacterImageForms(stage(4)), ['日常', '魔法少女', '恶堕']);
assert.equal(characterImageUrl('雨宫雫', '魔法少女', 2)?.includes('2.webp'), true);
assert.equal(characterImageUrl('鹭见凛', '魔法少女', 2), null);
assert.equal(characterImageUrl('未知', '日常'), null);

console.log('first target and image mapping validation passed');
