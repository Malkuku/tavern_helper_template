import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDiscoveredTarget, visibleWeChatData } from '../src/手机界面/store/discoveredTargets';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕\\系统配置';
const entries = ['唯一开局', '角色资源', '地图资源'].map(name => ({
  name: `<配置>${name}`,
  content: readFileSync(join(root, `${name}.json`), 'utf8'),
}));
const data = reconcileWorldbookStatData({ 作者: 987 }, entries).data as any;
const mainKeys = Object.keys(data.角色.主要角色);
assert.ok(mainKeys.length >= 2);
const [first, second] = mainKeys;

assert.equal(isDiscoveredTarget(data, 'user'), true);
assert.equal(isDiscoveredTarget(data, first), false);
assert.equal(isDiscoveredTarget(data, first.slice(0, 1)), false);
assert.deepEqual(Object.keys(visibleWeChatData(data)!.账号), ['user']);

const privateKey = `私聊:user&${first}`;
const groupKey = '群聊:测试隐藏成员';
data.手机.微信.会话[privateKey] = { 类型: '私聊', 成员: ['user', first], 消息: [] };
data.手机.微信.会话[groupKey] = { 类型: '群聊', 成员: ['user', first, second], 消息: [] };
assert.deepEqual(Object.keys(visibleWeChatData(data)!.会话), []);

data.系统.已发现目标 = [first];
assert.equal(isDiscoveredTarget(data, first), true);
assert.ok(visibleWeChatData(data)!.账号[first]);
assert.deepEqual(Object.keys(visibleWeChatData(data)!.会话), [privateKey]);
data.系统.已发现目标 = [first, second];
assert.deepEqual(Object.keys(visibleWeChatData(data)!.会话), [privateKey, groupKey]);
data.系统.已发现目标 = [second];
assert.equal(isDiscoveredTarget(data, first), false);
assert.deepEqual(Object.keys(visibleWeChatData(data)!.会话), []);

delete data.系统.已发现目标;
assert.equal(isDiscoveredTarget(data, second), false);
console.log('已发现目标与微信展示边界验证通过');
