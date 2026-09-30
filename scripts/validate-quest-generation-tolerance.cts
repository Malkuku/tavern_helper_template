// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import { refreshTasks } from '../src/手机界面/apps/quests/quests';

const task = () => ({ 描述: '调查异动', 目标: '确认原因', 评级: 'D', 奖励: 8 });
const stock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`任务${index + 1}`, task()]));
const data: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 },
  角色: { user: { 评级贡献: 0 } },
  任务: {},
  任务候选: {},
};
const oldTag = `<questVariable>${JSON.stringify(stock)}</questVariable>`;
const newTag = `<questVariable>${JSON.stringify({
  ...stock,
  任务1: { ...task(), 当前进度: '进行中', current_progress: '误写', 已完成: true, 备注: '额外说明' },
})}</questVariable>`;
refreshTasks(data, `${oldTag}\n${newTag}`);
assert.equal(Object.keys(data.任务候选).length, 6);
assert.equal(data.任务候选.任务1.当前进度, '未接取');
assert.equal(data.任务候选.任务1.已完成, false);
assert.equal(data.任务候选.任务1.备注, undefined);
assert.equal(data.系统.任务主动刷新次数, 0);

for (const count of [5, 7, 8]) {
  const current = { ...structuredClone(data), 系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 } };
  const candidates = Object.fromEntries(Array.from({ length: count }, (_, index) => [`候选${index}`, task()]));
  refreshTasks(current, `<questVariable>${JSON.stringify(candidates)}</questVariable>`);
  assert.equal(Object.keys(current.任务候选).length, count);
}
const partial = { ...structuredClone(data), 系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 } };
partial.任务.任务2 = { ...task(), 当前进度: '进行中', 已完成: false };
refreshTasks(partial, `<questVariable>${JSON.stringify({ ...stock, 任务1: { ...task(), 奖励: -1 } })}</questVariable>`);
assert.equal(partial.任务候选.任务1, undefined, '无效奖励的任务不展示');
assert.equal(partial.任务候选.任务2, undefined, '与已接任务重名的候选不展示');
assert.equal(Object.keys(partial.任务候选).length, 4);
assert.equal(partial.系统.任务主动刷新次数, 0);
const invalid = { ...structuredClone(data), 系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 } };
const before = structuredClone(invalid);
assert.throws(() => refreshTasks(invalid, '<questVariable>{}</questVariable>'), /没有可接取的候选任务/);
assert.deepEqual(invalid, before, '全无可用项不应结算刷新');
console.info('组织任务生成容错验证通过。');
