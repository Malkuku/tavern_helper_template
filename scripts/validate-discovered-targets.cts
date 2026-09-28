import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDiscoveredTarget } from '../src/手机界面/store/discoveredTargets';
import { friendRequest } from '../src/手机界面/apps/wechat/wechatData';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕\\系统配置';
const entries = ['唯一开局', '角色资源', '地图资源'].map(name => ({
  name: `<配置>${name}`,
  content: readFileSync(join(root, `${name}.json`), 'utf8'),
}));
entries.push({
  name: '<模板>通用恶堕值',
  content: readFileSync(join(root, '通用恶堕值.json'), 'utf8'),
});
const data = reconcileWorldbookStatData({ 作者: 987 }, entries).data as any;
const mainKeys = Object.keys(data.角色.主要角色);
assert.ok(mainKeys.length >= 2);
const [first, second] = mainKeys;
for (const id of [first, second]) data.手机.微信.账号[id] ??= { 昵称: id, 头像: '', 表情包: {}, 好友: [] };

assert.equal(isDiscoveredTarget(data, 'user'), true);
assert.equal(isDiscoveredTarget(data, first), false);
assert.equal(isDiscoveredTarget(data, first.slice(0, 1)), false);
for (const id of ['987', 'user', '林沐沐', first, second]) assert.ok(data.手机.微信.账号[id]);
const openingRequest = friendRequest(data.手机.微信.会话['私聊:user&987']);
assert.equal(openingRequest?.操作者, '987');
assert.equal(openingRequest?.目标, 'user');
assert.equal(openingRequest?.验证消息, '哥哥大人，有没有想人家呢～');
const noRequest = structuredClone(data);
delete noRequest.手机.微信.会话['私聊:user&987'];
assert.ok(noRequest.手机.微信.账号['987']);

const privateKey = `私聊:user&${first}`;
const groupKey = '群聊:测试隐藏成员';
data.手机.微信.会话[privateKey] = { 类型: '私聊', 成员: ['user', first], 消息: [] };
data.手机.微信.会话[groupKey] = { 类型: '群聊', 成员: ['user', first, second], 消息: [] };
assert.deepEqual(Object.keys(data.手机.微信.会话), ['私聊:user&987', privateKey, groupKey]);

data.系统.已发现目标 = [first];
assert.equal(isDiscoveredTarget(data, first), true);
assert.ok(data.手机.微信.账号[first]);
assert.deepEqual(Object.keys(data.手机.微信.会话), ['私聊:user&987', privateKey, groupKey]);
data.系统.已发现目标 = [first, second];
assert.deepEqual(Object.keys(data.手机.微信.会话), ['私聊:user&987', privateKey, groupKey]);
data.系统.已发现目标 = [second];
assert.equal(isDiscoveredTarget(data, first), false);
assert.deepEqual(Object.keys(data.手机.微信.会话), ['私聊:user&987', privateKey, groupKey]);

delete data.系统.已发现目标;
assert.equal(isDiscoveredTarget(data, second), false);
console.log('目标发现状态与微信数据独立，开局好友申请可见。');
