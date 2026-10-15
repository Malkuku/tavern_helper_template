// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { runInNewContext } from 'node:vm';
import {
  acceptTask,
  abandonTask,
  claimTask,
  emptyTaskWeek,
  refreshTasks,
  taskRefreshState,
  effectiveTaskRating,
  effectiveTaskReward,
} from '../src/手机界面/apps/quests/quests';
import { applyItemRefresh, itemRefreshQuote } from '../src/手机界面/apps/itemShop/itemShop';
import { applySkillRefresh, refreshQuote } from '../src/手机界面/apps/skillShop/skillShop';
import { initialStatDataSchema } from '../src/手机界面/store/initialDataSchema';
import type { stat_data } from '../src/手机界面/types';
import { transpileModule, ModuleKind } from 'typescript';
import { parse, compileTemplate } from 'vue/compiler-sfc';
import * as Vue from 'vue';
import { ratingContribution } from '../src/手机界面/store/userRating';
import { ratingVisualClass } from '../src/手机界面/apps/witch/ratingVisual';

const task = { 描述: '调查', 目标: '提交报告', 评级: 'D', 奖励: 8, 失败惩罚: '无' };
const payload = (tasks: object) => `<questVariable>${JSON.stringify(tasks)}</questVariable>`;
const fixture = () =>
  ({
    世界: { 时间: '2026-10-14T09:00[3]' },
    系统: {
      任务主动刷新次数: 5,
      任务下次刷新时间: '2026-10-19T00:00[1]',
      商店主动刷新次数: 200,
      技能主动刷新次数: 200,
    },
    角色: { user: { 评级贡献: 0, 恶堕积分: 100, 物品: {}, 技能: {} } },
    任务: {},
    任务候选: {},
    商店: {},
    技能商店: {},
    仓库: {},
    手机: { 定向刷新: null },
    任务统计: { 开始周: '2026-10-12', 周记录: { '2026-10-12': emptyTaskWeek('2026-10-12') } },
  }) as unknown as stat_data;

const data = fixture();
for (let index = 0; index < 12; index++) refreshTasks(data, payload({ 普通: task }));
assert.equal(taskRefreshState(data).available, true, '旧每周五次上限不再阻止刷新');
refreshTasks(
  data,
  payload({
    必接一: { ...task, 强制委托: true },
    必接二: { ...task, 强制委托: true },
    普通: { ...task, 强制委托: false },
  }),
);
assert.equal(initialStatDataSchema.shape.任务候选.safeParse(data.任务候选).success, true);
assert.equal(taskRefreshState(data).mandatoryCount, 2);
const blocked = structuredClone(data);
assert.throws(() => refreshTasks(data, payload({ 替换: task })), /先接取全部强制委托/);
assert.deepEqual(data, blocked, '刷新被拒绝时保留全部候选');
acceptTask(data, '普通');
assert.equal(taskRefreshState(data).available, false, '普通接取不解除强制限制');
acceptTask(data, '必接一');
assert.equal(Object.hasOwn(data.任务.必接一, '强制委托'), false);
assert.equal(initialStatDataSchema.shape.任务.safeParse(data.任务).success, true);
assert.equal(taskRefreshState(data).mandatoryCount, 1);
acceptTask(data, '必接二');
assert.equal(taskRefreshState(data).available, true);
abandonTask(data, '必接一');
assert.equal(data.任务.必接一.已失败, true, '接取后仍可放弃并等待惩罚');
assert.equal(data.任务统计.周记录['2026-10-12'].放弃, 1);
refreshTasks(data, payload({ 新强制: { ...task, 强制委托: true } }));
assert.equal(data.任务.必接二.当前进度, '进行中', '刷新保留已接任务');
data.世界.时间 = '2026-10-19T00:00[1]';
assert.equal(taskRefreshState(data).available, false, '跨周不能解除强制候选');
const full = fixture();
for (let index = 0; index < 5; index++)
  full.任务[`已接${index}`] = { ...task, 评级: 'D', 当前进度: '进行中', 已完成: false };
refreshTasks(full, payload({ 强制: { ...task, 强制委托: true } }));
const fullBefore = structuredClone(full);
assert.throws(() => acceptTask(full, '强制'), /最多同时接取 5 项/);
assert.deepEqual(full, fullBefore);
full.任务.已接0.已完成 = true;
claimTask(full, '已接0');
acceptTask(full, '强制');
assert.equal(Object.keys(full.任务).length, 5);
assert.equal(taskRefreshState(full).available, true);
const invalid = fixture();
refreshTasks(invalid, payload({ 错误: { ...task, 强制委托: 'true' }, 正常: task }));
assert.equal(invalid.任务候选.错误, undefined, '错误布尔值不成为可绕过限制的候选');
assert.ok(invalid.任务候选.正常, '旧结果缺少标记仍可上架');

const itemMessage = `<shopVariable>${JSON.stringify({ 道具: { 描述: '调查工具', 作用: '照明', 评级: 'D', 价格: 3, 数量: 1, 耐久: 1 } })}</shopVariable>`;
const skillMessage = `<skillVariable>${JSON.stringify({ 技能: { 描述: '观察', 作用: '辨别线索', 评级: 'D', 价格: 25 } })}</skillVariable>`;
for (const [kind, refresh, quote, message, price, surcharge] of [
  ['道具', applyItemRefresh, itemRefreshQuote, itemMessage, 2, 5],
  ['技能', applySkillRefresh, refreshQuote, skillMessage, 5, 20],
] as const) {
  const shop = fixture();
  for (const time of ['2026-10-14T09:00[3]', '2026-10-19T00:00[1]']) {
    shop.世界.时间 = time;
    assert.equal(quote(shop).price, price);
    const before = shop.角色.user.恶堕积分;
    refresh(shop, message);
    assert.equal(shop.角色.user.恶堕积分, before - price, '重复和跨周都收固定费');
  }
  shop.手机.定向刷新 = { 类型: kind, 要求: '调查', 普通报价: price };
  const before = shop.角色.user.恶堕积分;
  refresh(shop, message, true);
  assert.equal(shop.角色.user.恶堕积分, before - price - surcharge);
  assert.equal(shop.手机.定向刷新, null);
  shop.角色.user.恶堕积分 = price - 1;
  const insufficient = structuredClone(shop);
  assert.throws(() => refresh(shop, message), /积分不足/);
  assert.deepEqual(shop, insufficient);
  shop.角色.user.恶堕积分 = 100;
  const bad = structuredClone(shop);
  assert.throws(() => refresh(shop, message.replace(/\{.*\}/, '{}')));
  assert.deepEqual(shop, bad, '全无有效项时保留货架与余额');
}

const rule = readFileSync('O:/St Working/角色卡开发/魔法少女恶堕/魔法少女恶堕/更新规则/生成任务.ini', 'utf8');
const exampleJson = /<questVariable>\s*(\{[\s\S]*?\})\s*<\/questVariable>/.exec(rule)?.[1];
assert.ok(exampleJson, '生成规则包含 JSON 示例');
const exampleTasks = Object.values(JSON.parse(exampleJson)) as { 强制委托: boolean }[];
assert.ok(exampleTasks.length > 0);
assert.ok(
  exampleTasks.every(task => typeof task.强制委托 === 'boolean'),
  '每项示例必须包含布尔字段',
);
assert.ok(exampleTasks.some(task => task.强制委托) && exampleTasks.some(task => !task.强制委托), '示例覆盖两种标记');
const prelude = /<%_\s*(const active[\s\S]*?)_%>/.exec(rule)?.[1];
assert.ok(prelude);
function draw(trigger: number, range: number) {
  const values = [trigger, range];
  const randomMath = Object.create(Math);
  randomMath.random = () => values.shift() ?? 0;
  return Array.from(
    runInNewContext(`${prelude}\n;mandatoryRange`, {
      Math: randomMath,
      getvar: () => undefined,
      getChatMessages: () => [],
    }),
  );
}
assert.deepEqual(draw(1 / 3, 0), [0, 0], '触发边界外不得强制');
for (const [index, range] of [
  [0, [0, 2]],
  [1, [0, 3]],
  [2, [1, 2]],
  [3, [0, 1]],
  [4, [1, 3]],
] as const)
  assert.deepEqual(draw(0, (index + 0.5) / 5), range);
assert.deepEqual(draw(0, 0.999999), [1, 3], '最后一个范围不会越界');
const card = parse(readFileSync('src/手机界面/apps/quests/QuestCard.vue', 'utf8')).descriptor;
const template = compileTemplate({ source: card.template!.content, filename: 'QuestCard.vue', id: 'forced-quest' });
assert.deepEqual(template.errors, []);
const compiled = transpileModule(template.code, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
const context = {
  exports: {} as { render?: (...args: any[]) => any },
  require: () => ({ ...Vue, renderSlot: () => Vue.h('span') }),
};
runInNewContext(compiled, context);
for (const [accepted, mandatory, highlighted] of [
  [false, true, true],
  [false, false, false],
  [true, true, false],
]) {
  const node = context.exports.render!(
    {
      name: '候选测试',
      task: { ...task, 强制委托: mandatory },
      accepted,
      effectiveTaskRating,
      effectiveTaskReward,
      ratingContribution,
      ratingVisualClass,
    },
    [],
    {},
    {},
    {},
    {},
  );
  assert.equal(node.props.class.includes('quest-card-mandatory'), highlighted, '强制视觉只显示在候选');
  const badge = node.children.find((child: any) => child.props?.class === 'quest-card-mandatory-label');
  assert.equal(!!badge, highlighted, '徽标与候选状态同步');
}
console.info('强制候选、固定刷新费与 EJS 抽签行为验证通过。');
