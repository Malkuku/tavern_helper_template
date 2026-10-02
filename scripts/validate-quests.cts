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
  activeTaskCount,
} from '../src/手机界面/apps/quests/quests';
import { initialStatDataSchema } from '../src/手机界面/store/initialDataSchema';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const opening = JSON.parse(readFileSync(`${root}\\系统配置\\唯一开局.json`, 'utf8'));
assert.ok(initialStatDataSchema.shape.任务候选.safeParse(opening.固定数据.任务候选).success);
assert.ok(initialStatDataSchema.shape.任务.safeParse(opening.固定数据.任务).success);
const entries = ['唯一开局', '角色资源', '地图资源'].map(name => ({
  name: `<配置>${name}`,
  content: readFileSync(`${root}\\系统配置\\${name}.json`, 'utf8'),
}));
entries.push({
  name: '<模板>通用恶堕值',
  content: readFileSync(`${root}\\系统配置\\通用恶堕值.json`, 'utf8'),
});
entries.push({
  name: '<模板>通用好感度',
  content: readFileSync(`${root}\\系统配置\\通用好感度.json`, 'utf8'),
});
const assembled = reconcileWorldbookStatData({ 作者: 987 }, entries);
assert.equal(assembled.data.任务统计.开始周, taskWeekKey(assembled.data.世界.时间), '初始周由实际开局世界时间计算');
assert.ok(initialStatDataSchema.shape.任务候选.safeParse(assembled.data.任务候选).success);

const task = (rating = 'D') => ({
  描述: '调查异动',
  目标: '确认原因并报告',
  当前进度: '未接取',
  评级: rating,
  奖励: 8,
  失败惩罚: '无',
  已完成: false,
});
const stock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`任务${index + 1}`, task()]));
const result = `<questVariable>${JSON.stringify(stock)}</questVariable>`;
const data: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 },
  角色: { user: { 当前评级: 'D', 评级贡献: 0, 恶堕积分: 10 } },
  任务: {},
  任务候选: {},
  任务统计: { 开始周: '2026-9-28', 周记录: { '2026-9-28': emptyTaskWeek('2026-9-28') } },
};

assert.equal(taskRefreshState(data).available, true);
assert.throws(() => refreshTasks(data, '<questVariable>{}</questVariable>'), /没有可接取的候选任务/);
for (const count of [5, 7, 8]) {
  const variableCountData = structuredClone(data);
  const candidates = Object.fromEntries(Array.from({ length: count }, (_, index) => [`候选${index}`, task()]));
  refreshTasks(variableCountData, `<questVariable>${JSON.stringify(candidates)}</questVariable>`);
  assert.equal(Object.keys(variableCountData.任务候选).length, count, `有效的 ${count} 项任务可上架`);
}
const invalidRewardData = structuredClone(data);
refreshTasks(
  invalidRewardData,
  `<questVariable>${JSON.stringify({ ...stock, 任务1: { ...task(), 奖励: [8] } })}</questVariable>`,
);
assert.equal(invalidRewardData.任务候选.任务1, undefined, '奖励字段错误的候选不展示');
assert.equal(Object.keys(invalidRewardData.任务候选).length, 5);
assert.equal(invalidRewardData.系统.任务主动刷新次数, 1, '部分有效仍结算一次');
const missingPenaltyData = structuredClone(data);
refreshTasks(
  missingPenaltyData,
  `<questVariable>${JSON.stringify({ ...stock, 任务1: { 描述: '调查', 目标: '取得线索', 评级: 'D', 奖励: 8 } })}</questVariable>`,
);
assert.equal(missingPenaltyData.任务候选.任务1, undefined, '新生成任务缺少失败惩罚时跳过该项');
const invalidRatingData = structuredClone(data);
refreshTasks(invalidRatingData, `<questVariable>${JSON.stringify({ ...stock, 任务1: task('SS') })}</questVariable>`);
assert.equal(invalidRatingData.任务候选.任务1, undefined, '评级错误的候选不展示');
assert.deepEqual(data.任务候选, {}, '无效生成不改候选');
const tolerantStock = {
  ...stock,
  任务1: { ...task(), 当前进度: '进行中', 已完成: true, current_progress: '误写', 备注: '额外说明' },
};
const tolerantData = structuredClone(data);
refreshTasks(tolerantData, `${result}<questVariable>${JSON.stringify(tolerantStock)}</questVariable>`);
assert.equal(tolerantData.任务候选.任务1.当前进度, '未接取', '候选进度由手机统一设置');
assert.equal(tolerantData.任务候选.任务1.已完成, false, '候选完成标记由手机统一设置');
assert.equal(tolerantData.任务候选.任务1.已失败, false, '候选失败标记由手机统一设置');
assert.equal(tolerantData.任务候选.任务1.备注, undefined, '额外字段不写入变量');
refreshTasks(data, result);
assert.equal(Object.keys(data.任务候选).length, 6);
assert.equal(data.系统.任务下次刷新时间, '2026-10-5T00:00[1]');
assert.equal(taskRefreshState(data).remaining, 4);
const weeklyQuota = structuredClone(data);
for (let used = 2; used <= 5; used++) {
  refreshTasks(weeklyQuota, result);
  assert.equal(taskRefreshState(weeklyQuota).remaining, 5 - used);
}
assert.throws(() => refreshTasks(weeklyQuota, result), /次数已用完/);
assert.equal(weeklyQuota.系统.任务主动刷新次数, 5);
weeklyQuota.世界.时间 = '2026-10-5T00:00[1]';
assert.equal(taskRefreshState(weeklyQuota).remaining, 5, '周一恢复五次刷新机会');
refreshTasks(weeklyQuota, result);
assert.equal(weeklyQuota.系统.任务主动刷新次数, 1);
const legacyDaily = structuredClone(data);
legacyDaily.系统.任务下次刷新时间 = '2026-9-29T00:00[2]';
legacyDaily.世界.时间 = '2026-9-30T09:00[3]';
assert.equal(taskRefreshState(legacyDaily).remaining, 4, '旧每日刷新记录计入本周已用次数');

for (let index = 1; index <= 5; index++) acceptTask(data, `任务${index}`);
assert.equal(Object.keys(data.任务候选).length, 1, '第五项可接取且从候选移除');
assert.throws(() => acceptTask(data, '任务6'), /最多同时接取 5 项/);
data.任务.任务1.已完成 = true;
assert.throws(() => acceptTask(data, '任务6'), /最多同时接取 5 项/, '完成未领奖仍占名额');
assert.throws(() => abandonTask(data, '任务1'), /只能领取/);
assert.throws(() => claimTask(data, '任务2'), /尚未完成/);
assert.equal(claimTask(data, '任务1'), 8);
assert.equal(data.角色.user.恶堕积分, 18);
assert.equal(data.任务统计.周记录['2026-9-28'].完成, 1);
assert.equal(data.任务统计.周记录['2026-9-28'].完成评级.D, 1);
assert.equal(data.角色.user.评级贡献, 1, 'D 任务增加固定贡献');
assert.throws(() => claimTask(data, '任务1'), /没有这项/);
acceptTask(data, '任务6');
abandonTask(data, '任务2');
assert.equal(data.任务.任务2.已失败, true, '放弃标记失败并等待剧情结算');
assert.equal(activeTaskCount(data.任务), 4, '失败任务不占手动接取名额');
assert.throws(() => abandonTask(data, '任务2'), /已经失败/);
assert.throws(() => claimTask(data, '任务2'), /失败任务/);
assert.equal(data.任务统计.周记录['2026-9-28'].放弃, 1);
assert.equal(data.任务统计.周记录['2026-9-28'].放弃评级.D, 1);
assert.equal(data.任务候选.任务2, undefined, '放弃不回候选');
const overLimit = structuredClone(data);
overLimit.任务['剧情插入'] = { ...task(), 当前进度: '进行中', 已失败: false };
overLimit.任务['剧情插入二'] = { ...task(), 当前进度: '进行中', 已失败: false };
overLimit.任务候选['手动新增'] = task();
assert.equal(activeTaskCount(overLimit.任务), 6, '剧情插入任务即使超出手动上限也保留');
assert.throws(() => acceptTask(overLimit, '手动新增'), /最多同时接取 5 项/);

data.世界.时间 = '2026-9-29T00:00[2]';
assert.equal(taskRefreshState(data).available, true);
const duplicateData = structuredClone(data);
refreshTasks(duplicateData, result);
for (const name of Object.keys(data.任务))
  assert.equal(duplicateData.任务候选[name], undefined, '已接任务重名候选跳过');
assert.ok(Object.keys(duplicateData.任务候选).length > 0, '其他候选仍上架');
const nextStock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`新任务${index + 1}`, task('C')]));
refreshTasks(data, `<questVariable>${JSON.stringify(nextStock)}</questVariable>`);
assert.equal(data.任务候选.任务6, undefined, '成功刷新替换旧候选');
assert.equal(Object.keys(data.任务).length, 5, '成功刷新保留包括失败待结算项在内的任务');

data.世界.时间 = '2026-10-5T00:00[1]';
assert.equal(taskWeekStats(data).previous?.完成, 1);
data.任务.任务3.已完成 = true;
claimTask(data, '任务3');
assert.equal(data.任务统计.周记录['2026-10-5'].周起始, '2026-10-5');
assert.equal(data.任务统计.周记录['2026-10-5'].完成, 1);
assert.equal(data.任务统计.周记录['2026-9-28'].完成, 1, '更早的周汇总永久保留');

const weeklyRule = readFileSync(`${root}\\额外信息\\任务周指标.ini`, 'utf8');
const prelude = /<%_\s*\{\s*_%>\s*<%_([\s\S]*?)_%>/.exec(weeklyRule)?.[1];
assert.ok(prelude, '周指标规则必须包含 EJS 判断');
function ruleState(
  time: string,
  taskStats: unknown,
): { missed: boolean; claimed: number; currentClaimed: number; remaining: number } {
  return runInNewContext(`${prelude}\n;({ missed, claimed, currentClaimed, remaining })`, {
    getvar: (key: string) => (key === 'stat_data.世界.时间' ? time : taskStats),
  });
}
const firstWeek = { 开始周: '2026-9-28', 周记录: { '2026-9-28': emptyTaskWeek('2026-9-28') } };
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).missed, false);
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).remaining, 7, '本周尚未领奖时提示剩余 7 项');
firstWeek.周记录['2026-9-28'].完成 = 3;
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).currentClaimed, 3);
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).remaining, 4);
assert.equal(ruleState('2026-10-5T00:00[1]', firstWeek).missed, true, '周一开始触发上周未达标提示');
assert.equal(ruleState('2026-10-5T00:00[1]', firstWeek).remaining, 7, '跨周后本周进度归零');
firstWeek.周记录['2026-9-28'].完成 = 7;
assert.equal(ruleState('2026-10-5T00:00[1]', firstWeek).missed, false, '上周达标不触发问责');
firstWeek.周记录['2026-9-28'].完成 = 8;
assert.equal(ruleState('2026-9-29T10:00[2]', firstWeek).remaining, 0, '超过 KPI 后不产生负剩余数');
assert.match(weeklyRule, /<任务周指标>[\s\S]*必须完成至少 7 项/);
assert.match(weeklyRule, /本周已计入 <%- currentClaimed %> 项，还需 <%- remaining %> 项才能达标/);
assert.match(weeklyRule, /if \(remaining > 0\)/);

const generationRule = readFileSync(`${root}\\更新规则\\生成任务.ini`, 'utf8');
const generationPrelude = /<%_\s*(const active[\s\S]*?)_%>/.exec(generationRule)?.[1];
assert.ok(generationPrelude, '生成任务规则必须构造地图与已发现目标预览');
const previewMap = {
  星川市: {
    描述: '城市',
    子地图: {
      星川站: { 描述: '车站', 详情: ['换乘大厅'], 子地图: {} },
      中央广场: { 描述: '广场', 子地图: {} },
      河岸: { 描述: '河边', 子地图: {} },
    },
  },
  月海市: { 描述: '邻市', 子地图: { 月海港: { 描述: '港口', 子地图: {} } } },
};
function generationPreview(discovered: string[]) {
  return runInNewContext(`${generationPrelude}\n;({ regularMapPreview, randomMapPreview, discoveredKeys })`, {
    getChatMessages: () => [],
    getvar: (key: string) =>
      ({
        'stat_data.任务': {},
        'stat_data.地图': previewMap,
        'stat_data.世界.地图索引': '星川站',
        'stat_data.角色': {
          主要角色: { 索菲亚: { 基础信息: '学生', 人设阶段: { 好感度: { 当前等级: 1, 描述: { '1': '信任' } } } } },
        },
        'stat_data.系统.已发现目标': discovered,
      })[key],
  });
}
const withTarget = generationPreview(['索菲亚', '未发现角色']);
assert.ok(withTarget.regularMapPreview.some((node: { 路径: string }) => node.路径 === '星川市 / 星川站'));
assert.ok(withTarget.regularMapPreview.some((node: { 路径: string }) => node.路径 === '星川市 / 中央广场'));
assert.ok(withTarget.randomMapPreview.some((node: { 路径: string }) => node.路径 === '月海市 / 月海港'));
assert.deepEqual(Array.from(withTarget.discoveredKeys), ['索菲亚', '未发现角色']);
assert.equal(generationPreview([]).discoveredKeys.length, 0, '没有已发现目标时不泄漏预置角色');
assert.match(generationRule, /至少提供一项有机会提升其好感度的任务/);
assert.match(generationRule, /保留至少 2 项恶堕、色情或调教倾向的任务/);
assert.match(generationRule, /有已发现且具备好感度的角色时/);
const generationExample = /<questVariable>\s*(\{[\s\S]*?\})\s*<\/questVariable>/.exec(generationRule)?.[1];
assert.ok(generationExample, '生成任务规则必须提供完整 JSON 示例');
for (const example of Object.values(JSON.parse(generationExample)) as { 奖励: number; 失败惩罚: string }[]) {
  const points = /扣除 (\d+) 点恶堕积分/.exec(example.失败惩罚);
  if (points) assert.equal(Number(points[1]), Math.floor(example.奖励 / 2), '积分型失败惩罚在生成时写明奖励的一半');
}

const variableRule = readFileSync(`${root}\\更新规则\\变量更新规则.ini`, 'utf8');
const variablePrelude = /^<%_ \{ _%>\s*<%_([\s\S]*?)_%>/.exec(variableRule)?.[1];
assert.ok(variablePrelude, '变量更新规则必须构造当前任务和恶堕积分摘要');
const variableSummary = runInNewContext(`${variablePrelude}\n;statusOutput`, {
  getChatMessages: () => [],
  getvar: (key: string) =>
    ({
      'stat_data.世界': { 地图索引: '' },
      'stat_data.地图': {},
      'stat_data.角色.user': { 基础信息: {}, 恶堕积分: 12 },
      'stat_data.角色.主要角色': {},
      'stat_data.角色.次要角色': {},
      'stat_data.任务': { 待惩罚: { ...task(), 已失败: true, 失败惩罚: '失去 3 点恶堕积分' } },
    })[key],
});
assert.equal(variableSummary.角色.user.恶堕积分, 12, 'AI 能读取恶堕积分结算起点');
assert.equal(variableSummary.任务.待惩罚.已失败, true, '失败任务留在 AI 视图等待剧情结算');
assert.equal(variableSummary.任务.待惩罚.失败惩罚, '失去 3 点恶堕积分');
console.info('组织任务定向验证通过。');
