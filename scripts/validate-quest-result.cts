import assert from 'node:assert/strict';
import { refreshTasks } from '../src/手机界面/apps/quests/quests';

const task = { 描述: '调查', 目标: '取得线索', 评级: 'D', 奖励: 8 };
const candidates = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`任务${index + 1}`, { ...task }]));
const second = candidates.任务2 as Record<string, unknown>;
second.current_progress = '误写';
const body = `<questVariable>{&#x20;${Object.entries(candidates)
  .map(([name, item]) => `${JSON.stringify(name)}:${JSON.stringify(item)}`)
  .join(',&#x20;')}}</questVariable>`.replace('current_progress', 'current\\_progress');
const data: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 },
  任务: {},
  任务候选: {},
};

const invalid = body.replace('"奖励":8', '"奖励":[8]');
assert.throws(() => refreshTasks(data, invalid), /字段无效/);
assert.deepEqual(data.任务候选, {}, '字段无效时不部分写入');
assert.equal(data.系统.任务主动刷新次数, 0);
refreshTasks(data, body);
assert.equal(Object.keys(data.任务候选).length, 6);
assert.equal(data.任务候选.任务2.当前进度, '未接取');
assert.equal(data.任务候选.任务2.已完成, false);
assert.equal(data.系统.任务主动刷新次数, 1);
assert.equal(data.系统.任务下次刷新时间, '2026-9-29T00:00[2]');
assert.throws(() => refreshTasks(data, body), /次数已用完/);
console.info('任务正文结果回归通过。');
