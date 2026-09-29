import assert from 'node:assert/strict';
import { progressNotices } from '../src/进度变化提示/diff';
import type { stat_data } from '../src/手机界面/types';

function snapshot(progress = '进行中', completed = false, mainLevel = 2, minorLevel = 0, experience = 0) {
  return {
    任务: { 巡查: { 当前进度: progress, 已完成: completed } },
    角色: {
      主要角色: { 小雨: { 人设阶段: { 创伤稳定度: { 当前等级: mainLevel, 累计经验: experience } } } },
      次要角色: { 小花: { 人设阶段: { 恶堕度: { 当前等级: minorLevel } } } },
    },
  } as unknown as stat_data;
}

const before = snapshot();
assert.deepEqual(progressNotices(undefined, before), []);
assert.deepEqual(progressNotices(before, snapshot()), []);
assert.deepEqual(progressNotices(before, snapshot('进行中', false, 2, 0, 20)), []);

const changes = progressNotices(before, snapshot('找到线索', true, 3, 1));
assert.equal(changes.length, 3);
assert.deepEqual(
  changes.map(item => item.title),
  ['巡查', '小雨 · 创伤稳定度', '小花 · 恶堕度'],
);
assert.equal(changes[0].detail, '进行中 → 找到线索 · 已完成');
assert.equal(changes[1].detail, '2 级 → 3 级');
assert.equal(changes[2].detail, '0 级 → 1 级');

const newTask = snapshot();
newTask.任务['新任务'] = { 当前进度: '进行中' } as stat_data['任务'][string];
assert.deepEqual(progressNotices(before, newTask), []);

console.log('楼层进度差异断言通过');
