/* eslint-disable import-x/no-nodejs-modules -- 验证外部角色卡规则的真实脚本段与配置。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const time = '2026-10-15T10:00[4]';
const key = '私聊:user&甲';
const quote = { 楼层ID: 98, 内容下标: 0, 发送者: '甲', 时间: time, 内容: ['引用原文'] };
const snapshot = {
  转发: { 私聊: { 成员: ['user', '甲'], 消息: { '2': { 发送者: '甲', 时间: time, 内容: ['快照'] } } } },
};
const messages = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [
    String(i + 1),
    {
      发送者: '甲',
      时间: time,
      内容: i === 99 ? [snapshot] : [`消息${i + 1}`],
      ...(i === 99 ? { 引用: quote } : {}),
    },
  ]),
);
const wechat = {
  账号: { user: { 昵称: '我', 好友: ['甲'], 表情包: {} }, 甲: { 昵称: '甲', 好友: ['user'], 表情包: {} } },
  会话: { [key]: { 类型: '私聊', 成员: ['user', '甲'], 消息: messages } },
  准备发送: { 楼层ID: 101, 会话: key, 时间: time, 内容: ['待发'], 已确认: true },
};
for (const name of ['微信主动聊天规则', '微信后台聊天规则']) {
  const rule = readFileSync(join(root, '更新规则', name + '.ini'), 'utf8');
  // 执行规则的完整上下文脚本段；宿主 EJS 引擎不在本地依赖中。
  const blocks = [...rule.matchAll(/<%_([\s\S]*?)_%>/g)];
  const script = blocks.find(([, code]) => code.includes('const recent ='))?.[1];
  assert.ok(script);
  const result = runInNewContext(script + '\nJSON.stringify({ runtime, yaml: jsonToYaml(runtime) });', {
    getChatMessages: () => [{ content: '发微信给甲，继续聊天' }],
    getvar: (path: string) =>
      ({
        'stat_data.手机.微信': wechat,
        'stat_data.世界': { 时间: time },
        'stat_data.角色.主要角色': { 甲: { 在场: true } },
      })[path],
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
  });
  const { runtime, yaml } = JSON.parse(result);
  const session = runtime.目标会话 ?? runtime.当前会话;
  assert.equal(session.key, key, name);
  assert.equal(session.下一楼层ID, 101, name);
  assert.ok(!Array.isArray(session.最近消息), name);
  assert.equal(session.最近消息['100'].楼层ID, undefined, name);
  assert.deepEqual(session.最近消息['100'].引用, quote, name);
  assert.deepEqual(session.最近消息['100'].内容[0], snapshot, name);
  assert.ok(yaml.includes('100:'), name);
  assert.ok(yaml.includes('下一楼层ID: 101'), name);
  if (runtime.准备发送) assert.equal(runtime.准备发送.楼层ID, 101, name);
}
const entries = ['唯一开局', '角色资源', '地图资源'].map(name => ({
  name: '<配置>' + name,
  content: readFileSync(join(root, '系统配置', name + '.json'), 'utf8'),
}));
for (const name of ['通用恶堕值', '通用好感度'])
  entries.push({ name: '<模板>' + name, content: readFileSync(join(root, '系统配置', name + '.json'), 'utf8') });
const data = reconcileWorldbookStatData({ 作者: 987 }, entries).data as any;
for (const session of Object.values(data.手机.微信.会话) as any[]) {
  assert.ok(!Array.isArray(session.消息));
  for (const [floor, item] of Object.entries(session.消息) as [string, any][]) {
    assert.match(floor, /^[1-9]\d*$/);
    assert.equal(item.楼层ID, undefined);
  }
}
console.info('微信两份规则脚本及真实开局配置通过：对象历史、下一楼层、引用与转发。');
