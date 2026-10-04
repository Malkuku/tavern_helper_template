// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import {
  abandonTask,
  claimTask,
  emptyTaskWeek,
  effectiveTaskRating,
  effectiveTaskReward,
  refreshTasks,
  taskWeekHistory,
  taskWeekStats,
} from '../src/手机界面/apps/quests/quests';
import { ratingContribution, userRatingFromContribution } from '../src/手机界面/store/userRating';

const week = '2026-9-28';
const data: any = {
  世界: { 时间: '2026-9-28T12:00[1]' },
  系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 },
  角色: { user: { 当前评级: 'D', 评级贡献: 0, 恶堕积分: 0 } },
  任务: {},
  任务候选: {},
  任务统计: { 开始周: week, 周记录: { [week]: emptyTaskWeek(week) } },
};
const task = (rating: 'D' | 'C' | 'B' | 'A' | 'S', reward = 10) => ({
  描述: '目标',
  目标: '完成',
  当前进度: '已完成',
  评级: rating,
  奖励: reward,
  已完成: true,
});
function claim(rating: 'D' | 'C' | 'B' | 'A' | 'S') {
  data.任务.测试 = task(rating);
  claimTask(data, '测试');
}
for (const [current, next] of [
  ['D', 'C'],
  ['C', 'B'],
  ['B', 'A'],
  ['A', 'S'],
] as const) {
  for (let i = 0; i < 11; i++) claim(current);
  assert.equal(data.角色.user.当前评级, current, `11 个 ${current} 任务仍未晋升`);
  claim(current);
  assert.equal(data.角色.user.当前评级, next, `12 个 ${current} 任务晋升 ${next}`);
}
assert.equal(data.角色.user.评级贡献, 432);
assert.equal(data.角色.user.恶堕积分, 480, '积分与贡献分开累加');
assert.deepEqual(ratingContribution, { D: 1, C: 3, B: 8, A: 24, S: 72 });

for (const [points, next, count] of [
  [0, 'C', 4],
  [12, 'B', 5],
  [48, 'A', 4],
  [144, 'S', 4],
] as const) {
  const gained = ratingContribution[next] * count;
  assert.notEqual(userRatingFromContribution(points + gained - ratingContribution[next]), next);
  assert.equal(userRatingFromContribution(points + gained), next, `${count} 个高一档任务可晋级`);
}

data.角色.user.评级贡献 = 0;
data.角色.user.当前评级 = 'D';
const generated = {
  D: { 描述: '低级', 目标: '完成', 评级: 'D', 奖励: 1, 失败惩罚: '无' },
  C: { 描述: '越级', 目标: '完成', 评级: 'C', 奖励: 9999, 失败惩罚: '无' },
  B: { 描述: '超限', 目标: '完成', 评级: 'B', 奖励: 60, 失败惩罚: '无' },
};
refreshTasks(data, `<questVariable>${JSON.stringify(generated)}</questVariable>`);
assert.deepEqual(Object.keys(data.任务候选), ['D', 'C'], '超限单项跳过，金额区间不硬拦截');

data.世界.时间 = '2026-10-12T12:00[1]';
claim('D');
assert.equal(taskWeekStats(data).previous?.完成, 0, '空白上周仍按 0 计');
assert.deepEqual(
  taskWeekHistory(data).map(record => record.周起始),
  ['2026-10-12', '2026-10-5', '2026-9-28'],
  '历史页显示包括空白周在内的所有周',
);
assert.equal(data.任务统计.周记录[week].完成, 48, '两周以前的汇总永久保留');
assert.equal(data.任务统计.周记录['2026-10-12'].完成, 1);
assert.throws(() => claimTask(data, '测试'), /没有这项/, '任务不能重复领奖');
assert.equal(effectiveTaskRating(undefined), 'D');
assert.equal(effectiveTaskRating('S'), 'S');
const beforeFallbackPoints = data.角色.user.评级贡献;
const beforeFallbackBalance = data.角色.user.恶堕积分;
const beforeFallbackClaims = data.任务统计.周记录['2026-10-12'].完成评级.D;
data.任务.缺失评级 = { ...task('D'), 评级: undefined };
assert.equal(claimTask(data, '缺失评级'), 10, '评级缺失的已完成任务仍可领奖');
assert.equal(data.角色.user.评级贡献, beforeFallbackPoints + 1, '缺失评级按 D 级贡献结算');
assert.equal(data.角色.user.恶堕积分, beforeFallbackBalance + 10, '保留原任务积分奖励');
assert.equal(data.任务统计.周记录['2026-10-12'].完成评级.D, beforeFallbackClaims + 1);
assert.equal(data.任务.缺失评级, undefined, '领奖后移除任务以清除提醒');
data.任务.无效评级 = { ...task('D'), 评级: '未知', 已完成: false };
abandonTask(data, '无效评级');
assert.equal(data.任务统计.周记录['2026-10-12'].放弃评级.D, 1, '放弃任务也按 D 级记录');
const damaged = structuredClone(data);
damaged.任务 = { 待领奖: { ...task('C'), 奖励: undefined } };
damaged.角色.user.恶堕积分 = undefined;
damaged.角色.user.评级贡献 = undefined;
assert.equal(effectiveTaskReward(damaged.任务.待领奖), 20, '缺失奖励按评级最低值展示');
assert.equal(claimTask(damaged, '待领奖'), 20, '异常奖励和余额仍可结算');
assert.equal(damaged.角色.user.恶堕积分, 20);
assert.equal(damaged.角色.user.评级贡献, 3);
assert.equal(damaged.任务.待领奖, undefined, '领奖后删除任务，待领奖红点可消失');
const capped = structuredClone(data);
capped.任务 = { 待领奖: task('D') };
capped.角色.user.恶堕积分 = Number.MAX_SAFE_INTEGER;
capped.角色.user.评级贡献 = Number.MAX_SAFE_INTEGER;
assert.equal(claimTask(capped, '待领奖'), 0, '数值达到上限时按实际入账额返回');
assert.equal(capped.任务.待领奖, undefined);
console.info('评级成长与永久周汇总验证通过。');
