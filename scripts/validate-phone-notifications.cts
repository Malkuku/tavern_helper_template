import assert from 'node:assert/strict';
import {
  activeWitchNoticeHistory,
  nextWitchNotice,
  witchNotices,
  witchStabilityNotices,
  witchTaskNotices,
} from '../src/手机界面/apps/witch/witchNotifications';
import type { stat_data } from '../src/手机界面/types';
import { ratingVisualClass } from '../src/手机界面/apps/witch/ratingVisual';

function data(time = '2026-9-28T12:00[1]'): stat_data {
  return {
    世界: { 时间: time },
    系统: { 已发现目标: ['鹭见凛'], 任务下次刷新时间: '', 任务主动刷新次数: 0 },
    任务: {},
  } as stat_data;
}

const initial = data();
initial.系统.已发现目标 = [];
assert.deepEqual(witchTaskNotices(initial), []);
initial.系统.已发现目标 = ['鹭见凛'];
initial.角色 = {
  主要角色: {
    鹭见凛: { 人设阶段: { 创伤稳定度: { 当前等级: 3 } } },
    雨宫雫: { 人设阶段: { 创伤稳定度: { 当前等级: 1 } } },
  },
  次要角色: { 路人: { 人设阶段: { 创伤稳定度: { 当前等级: 0 } } } },
} as unknown as stat_data['角色'];
assert.deepEqual(witchStabilityNotices(initial), []);
initial.角色.主要角色.鹭见凛.人设阶段.创伤稳定度.当前等级 = 2;
assert.deepEqual(
  witchStabilityNotices(initial).map(item => [item.key, item.tab, item.target, item.warning]),
  [['stability:鹭见凛:2', 'observe', '鹭见凛', true]],
);
assert.equal(witchNotices(initial)[0].title, '创伤稳定度警告');
let history = [witchNotices(initial)[0].key];
assert.equal(nextWitchNotice(witchStabilityNotices(initial), history), null);
assert.deepEqual(activeWitchNoticeHistory(history, witchStabilityNotices(initial)), history);
const persistedHistory = JSON.parse(JSON.stringify(history)) as string[];
assert.equal(nextWitchNotice(witchStabilityNotices(initial), persistedHistory), null);
initial.角色.主要角色.鹭见凛.人设阶段.创伤稳定度.当前等级 = 1;
history = activeWitchNoticeHistory(history, witchStabilityNotices(initial));
assert.deepEqual(history, []);
assert.equal(nextWitchNotice(witchStabilityNotices(initial), history)?.key, 'stability:鹭见凛:1');
history = ['stability:鹭见凛:1'];
initial.角色.主要角色.鹭见凛.人设阶段.创伤稳定度.当前等级 = 3;
history = activeWitchNoticeHistory(history, witchStabilityNotices(initial));
assert.deepEqual(history, []);
initial.角色.主要角色.鹭见凛.人设阶段.创伤稳定度.当前等级 = 2;
assert.equal(nextWitchNotice(witchStabilityNotices(initial), history)?.key, 'stability:鹭见凛:2');
initial.系统.已发现目标 = ['鹭见凛', '雨宫雫', '路人'];
assert.deepEqual(
  witchStabilityNotices(initial).map(item => item.target),
  ['鹭见凛', '雨宫雫'],
);
initial.系统.已发现目标 = ['鹭见凛'];
initial.角色.主要角色.鹭见凛.人设阶段.创伤稳定度.当前等级 = 3;
assert.deepEqual(
  witchTaskNotices(initial).map(item => item.key),
  [],
);

initial.任务['已完成的任务'] = { 描述: '', 目标: '', 当前进度: '已完成', 评级: 'D', 奖励: 5, 已完成: true };
assert.equal(ratingVisualClass(initial.任务['已完成的任务'].评级), 'witch-grade-d');
assert.equal(ratingVisualClass(undefined), undefined, '异常评级不应使首页和任务卡片渲染中断');
assert.deepEqual(
  witchTaskNotices(initial).map(item => item.title),
  ['任务奖励待领取'],
);

initial.系统.任务下次刷新时间 = '2026-9-29T00:00[2]';
initial.系统.任务主动刷新次数 = 1;
assert.deepEqual(activeWitchNoticeHistory(['refresh:2026-9-28'], witchTaskNotices(initial)), []);
assert.deepEqual(
  witchTaskNotices(initial).map(item => item.title),
  ['任务奖励待领取'],
);

delete initial.任务['已完成的任务'];
assert.deepEqual(witchTaskNotices(initial), []);
assert.deepEqual(
  activeWitchNoticeHistory(['claim:已完成的任务'], witchTaskNotices(initial)),
  [],
  '任务已消失时清除脚本变量中的待领奖提醒记录',
);

initial.世界.时间 = '2026-9-29T00:00[2]';
assert.deepEqual(
  witchTaskNotices(initial).map(item => item.key),
  [],
);

console.log('手机应用任务提醒验证通过');
