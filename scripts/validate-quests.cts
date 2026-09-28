import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  abandonTask,
  acceptTask,
  claimTask,
  emptyTaskWeek,
  refreshTasks,
  taskRefreshState,
  taskWeekKey,
  taskWeekStats,
} from '../src/手机界面/apps/quests/quests';
import { initialStatDataSchema } from '../src/手机界面/store/initialDataSchema';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const opening = JSON.parse(readFileSync(`${root}\\系统配置\\唯一开局.json`, 'utf8'));
assert.deepEqual(opening.固定数据.任务候选, {}, '新开局提供空候选表');
assert.ok(initialStatDataSchema.shape.任务.safeParse(opening.固定数据.任务).success);
const entries = ['唯一开局', '角色资源', '地图资源'].map(name => ({
  name: `<配置>${name}`,
  content: readFileSync(`${root}\\系统配置\\${name}.json`, 'utf8'),
}));
const assembled = reconcileWorldbookStatData({ 作者: 987 }, entries);
assert.equal(assembled.data.任务统计.开始周, taskWeekKey(assembled.data.世界.时间), '初始周由实际开局世界时间计算');
assert.deepEqual(assembled.data.任务候选, {});

const task = (rating = 'D') => ({
  描述: '调查异动',
  目标: '确认原因并报告',
  当前进度: '未接取',
  评级: rating,
  奖励: 8,
  已完成: false,
});
const stock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`任务${index + 1}`, task()]));
const result = `<questVariable>${JSON.stringify(stock)}</questVariable>`;
const data: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 },
  角色: { user: { 恶堕积分: 10 } },
  任务: {},
  任务候选: {},
  任务统计: { 开始周: '2026-9-28', 本周: emptyTaskWeek('2026-9-28'), 上周: null },
};

assert.equal(taskRefreshState(data).available, true);
assert.throws(() => refreshTasks(data, '<questVariable>{}</questVariable>'), /恰好包含 6 个/);
assert.throws(
  () =>
    refreshTasks(
      data,
      `<questVariable>${JSON.stringify({ ...stock, 任务1: { ...task(), 奖励: [8] } })}</questVariable>`,
    ),
  /字段无效/,
  '旧奖励数组格式必须拒绝',
);
assert.throws(
  () => refreshTasks(data, `<questVariable>${JSON.stringify({ ...stock, 任务1: task('SS') })}</questVariable>`),
  /字段无效/,
  '任务评级只能为 D 到 S',
);
assert.deepEqual(data.任务候选, {}, '无效生成不改候选');
refreshTasks(data, result);
assert.equal(Object.keys(data.任务候选).length, 6);
assert.equal(data.系统.任务下次刷新时间, '2026-9-29T00:00[2]');
assert.equal(taskRefreshState(data).available, false);
assert.throws(() => refreshTasks(data, result), /次数已用完/);

for (let index = 1; index <= 4; index++) acceptTask(data, `任务${index}`);
assert.equal(Object.keys(data.任务候选).length, 2, '接取即从候选移除');
assert.throws(() => acceptTask(data, '任务5'), /最多同时接取/);
data.任务.任务1.已完成 = true;
assert.throws(() => acceptTask(data, '任务5'), /最多同时接取/, '完成未领奖仍占名额');
assert.throws(() => abandonTask(data, '任务1'), /只能领取/);
assert.throws(() => claimTask(data, '任务2'), /尚未完成/);
assert.equal(claimTask(data, '任务1'), 8);
assert.equal(data.角色.user.恶堕积分, 18);
assert.equal(data.任务统计.本周.完成, 1);
assert.equal(data.任务统计.本周.完成评级.D, 1);
assert.throws(() => claimTask(data, '任务1'), /没有这项/);
acceptTask(data, '任务5');
abandonTask(data, '任务2');
assert.equal(data.任务统计.本周.放弃, 1);
assert.equal(data.任务统计.本周.放弃评级.D, 1);
assert.equal(data.任务候选.任务2, undefined, '放弃不回候选');

data.世界.时间 = '2026-9-29T00:00[2]';
assert.equal(taskRefreshState(data).available, true);
assert.throws(() => refreshTasks(data, result), /已接取/, '新货架不能与已接任务重名');
const nextStock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`新任务${index + 1}`, task('C')]));
refreshTasks(data, `<questVariable>${JSON.stringify(nextStock)}</questVariable>`);
assert.equal(data.任务候选.任务6, undefined, '成功刷新替换旧候选');
assert.equal(Object.keys(data.任务).length, 3, '成功刷新保留已接任务');

data.世界.时间 = '2026-10-5T00:00[1]';
assert.equal(taskWeekStats(data).previous?.完成, 1);
data.任务.任务3.已完成 = true;
claimTask(data, '任务3');
assert.equal(data.任务统计.本周.周起始, '2026-10-5');
assert.equal(data.任务统计.本周.完成, 1);
assert.equal(data.任务统计.上周?.完成, 1);

const weeklyRule = readFileSync(`${root}\\额外信息\\任务周指标.ini`, 'utf8');
const prelude = /<%_([\s\S]*?)_%>/.exec(weeklyRule)?.[1];
assert.ok(prelude, '周指标规则必须包含 EJS 判断');
function ruleState(
  time: string,
  taskStats: unknown,
): { missed: boolean; claimed: number; currentClaimed: number; remaining: number } {
  return runInNewContext(`${prelude}\n;({ missed, claimed, currentClaimed, remaining })`, {
    getvar: (key: string) => (key === 'stat_data.世界.时间' ? time : taskStats),
  });
}
const firstWeek = { 开始周: '2026-9-28', 本周: emptyTaskWeek('2026-9-28'), 上周: null };
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).missed, false);
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).remaining, 7, '本周尚未领奖时提示剩余 7 项');
firstWeek.本周.完成 = 3;
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).currentClaimed, 3);
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).remaining, 4);
assert.equal(ruleState('2026-10-5T00:00[1]', firstWeek).missed, true, '周一开始触发上周未达标提示');
assert.equal(ruleState('2026-10-5T00:00[1]', firstWeek).remaining, 7, '跨周后本周进度归零');
firstWeek.本周.完成 = 7;
assert.equal(ruleState('2026-10-5T00:00[1]', firstWeek).missed, false, '上周达标不触发问责');
assert.match(weeklyRule, /<任务周指标>[\s\S]*本周已领取 <%- currentClaimed %> 项，还需 <%- remaining %> 项/);
assert.match(weeklyRule, /if \(remaining > 0\)/);
console.info('组织任务定向验证通过。');
