// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import {
  claimTask,
  emptyTaskWeek,
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
for (let i = 0; i < 10; i++) claim('D');
assert.equal(data.角色.user.当前评级, 'C', '10 个 D 任务晋升 C');
for (let i = 0; i < 10; i++) claim('C');
assert.equal(data.角色.user.当前评级, 'B', '10 个 C 任务晋升 B');
for (let i = 0; i < 10; i++) claim('B');
assert.equal(data.角色.user.当前评级, 'A', '10 个 B 任务晋升 A');
for (let i = 0; i < 10; i++) claim('A');
assert.equal(data.角色.user.当前评级, 'S', '10 个 A 任务晋升 S');
assert.equal(data.角色.user.评级贡献, 360);
assert.equal(data.角色.user.恶堕积分, 400, '积分与贡献分开累加');
assert.deepEqual(ratingContribution, { D: 1, C: 3, B: 8, A: 24, S: 72 });

for (const [points, next, count] of [
  [0, 'C', 4],
  [10, 'B', 4],
  [40, 'A', 4],
  [120, 'S', 4],
] as const) {
  const gained = ratingContribution[next] * count;
  assert.notEqual(userRatingFromContribution(points + gained - ratingContribution[next]), next);
  assert.equal(userRatingFromContribution(points + gained), next, '4 个高一档任务可晋级');
}

data.角色.user.评级贡献 = 0;
data.角色.user.当前评级 = 'D';
const generated = {
  D: { 描述: '低级', 目标: '完成', 评级: 'D', 奖励: 1 },
  C: { 描述: '越级', 目标: '完成', 评级: 'C', 奖励: 9999 },
  B: { 描述: '超限', 目标: '完成', 评级: 'B', 奖励: 60 },
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
assert.equal(data.任务统计.周记录[week].完成, 40, '两周以前的汇总永久保留');
assert.equal(data.任务统计.周记录['2026-10-12'].完成, 1);
assert.throws(() => claimTask(data, '测试'), /没有这项/, '任务不能重复领奖');
console.info('评级成长与永久周汇总验证通过。');
