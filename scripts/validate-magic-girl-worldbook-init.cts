import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const fixtureRoot = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const entry = (name: string, content: string) => ({ name, content });
const tag = (path: string, type: string, value: string, dynamic = false) =>
  `<JSON path="$.${path}" type="${type}"${dynamic ? ' dynamic="true"' : ''}>\n${value}\n</JSON>`;
const entries = [
  entry('当前世界书版本', 'version: 2.0.0'),
  entry('StatData', JSON.stringify({ 世界: { 时间: '2026-09-26T03:10[6]' } })),
  entry('[initvar]', tag('系统', 'json', '{"商店主动刷新次数":0}', true)),
  entry(
    '<人设配置>user',
    [tag('角色.user.基础信息', 'string', '新版身份', true), tag('角色.user.金钱', 'number', '120', true)].join('\n'),
  ),
  entry(
    '<人设配置>新人物',
    [
      tag('角色.主要角色.新人物.性格', 'string', '新版性格'),
      tag('角色.主要角色.新人物.基础信息', 'string', '新人物介绍'),
      tag('角色.主要角色.新人物.在场', 'boolean', 'false', true),
      tag('角色.主要角色.新人物.额外字段', 'string', '应保留'),
    ].join('\n'),
  ),
];

const old = {
  系统: { 版本: '1.0.0', 商店主动刷新次数: 5, 商店待刷新: true },
  角色: { user: { 基础信息: { 身份: '旧版身份' }, 金钱: 999 }, 主要角色: {} },
  世界: { 时间: '2026-09-26T03:10[6]' },
};
const upgraded = reconcileWorldbookStatData(old, entries);
assert.equal(upgraded.data.角色.user.基础信息, '身份：旧版身份');
assert.equal(upgraded.data.角色.user.金钱, 999);
assert.equal(upgraded.data.系统.商店主动刷新次数, 5);
assert.equal('商店待刷新' in upgraded.data.系统, false);
assert.deepEqual(upgraded.data.角色.主要角色.新人物, {
  性格: '新版性格',
  基础信息: '新人物介绍',
  在场: false,
  额外字段: '应保留',
});
assert.equal(upgraded.data.系统.版本, '2.0.0');
assert.deepEqual(upgraded.data.手机.微信, {
  账号: {
    user: { 昵称: '我', 头像: '', 表情包: {}, 好友: ['新人物'] },
    新人物: { 昵称: '新人物', 头像: '', 表情包: {}, 好友: ['user'] },
  },
  会话: {},
  准备发送: null,
});
assert.equal(old.系统.版本, '1.0.0');
assert.equal(reconcileWorldbookStatData(upgraded.data, entries).changed, false);

const legacyRequest = structuredClone(upgraded.data);
legacyRequest.手机.微信.账号.user.好友请求 = { 收到: {}, 发出: { 陌生人: { 验证消息: '加好友' } } };
legacyRequest.手机.微信.账号.陌生人 = {
  昵称: '陌生人',
  头像: '',
  表情包: {},
  好友: [],
  好友请求: { 收到: { user: { 验证消息: '加好友' } }, 发出: {} },
};
const migrated = reconcileWorldbookStatData(legacyRequest, entries).data.手机.微信;
assert.equal(migrated.会话['私聊:user&陌生人'].消息[0].操作, '好友申请');
assert.equal(migrated.会话['私聊:user&陌生人'].消息.length, 1);
assert.equal('好友请求' in migrated.账号.user, false);
assert.equal(reconcileWorldbookStatData({ ...upgraded.data, 手机: { 微信: migrated } }, entries).changed, false);

const removedFriend = structuredClone(upgraded.data);
removedFriend.手机.微信.账号.user.好友 = [];
removedFriend.手机.微信.账号.新人物.好友 = [];
assert.deepEqual(reconcileWorldbookStatData(removedFriend, entries).data.手机.微信.账号.user.好友, []);
assert.deepEqual(reconcileWorldbookStatData(removedFriend, entries).data.手机.微信.账号.新人物.好友, []);

const missingAccount = structuredClone(upgraded.data);
delete missingAccount.手机.微信.账号.新人物;
const repairedAccount = reconcileWorldbookStatData(missingAccount, entries).data.手机.微信.账号;
assert.deepEqual(repairedAccount.新人物.好友, ['user']);
assert.deepEqual(repairedAccount.user.好友, ['新人物']);

const missingRole = structuredClone(upgraded.data);
delete missingRole.角色.主要角色.新人物;
assert.deepEqual(reconcileWorldbookStatData(missingRole, entries).data.角色.主要角色.新人物, {
  性格: '新版性格',
  基础信息: '新人物介绍',
  在场: false,
  额外字段: '应保留',
});

const sameVersion = structuredClone(upgraded.data);
sameVersion.角色.user.基础信息 = '玩家改写';
(sameVersion.角色.主要角色.新人物 as any).基础信息 = { 姓名: '旧档案名', 身份: '旧身份' };
delete sameVersion.角色.user.金钱;
assert.equal(reconcileWorldbookStatData(sameVersion, entries).data.角色.user.基础信息, '玩家改写');
assert.equal(
  reconcileWorldbookStatData(sameVersion, entries).data.角色.主要角色.新人物.基础信息,
  '姓名：旧档案名\n身份：旧身份',
);
assert.equal(reconcileWorldbookStatData(sameVersion, entries).data.角色.user.金钱, 120);
assert.throws(() =>
  reconcileWorldbookStatData({}, [
    ...entries,
    entry('<人设配置>坏人物', tag('角色.主要角色.坏人物.数值', 'number', 'NaN')),
  ]),
);

// 本地源文件存在时，验证用户提供的人设和初始化标签都可解析。
try {
  const real = [
    entry('当前世界书版本', readFileSync(join(fixtureRoot, '系统配置', '当前世界书版本.yaml'), 'utf8')),
    entry('StatData', readFileSync(join(fixtureRoot, '系统配置', 'statdata.json'), 'utf8')),
    entry('[initvar]', readFileSync(join(fixtureRoot, '系统配置', 'initvar'), 'utf8')),
    ...['user', '小鸟游琉璃', '索菲亚', '鹭见凛'].map(name =>
      entry(`<人设配置>${name}`, readFileSync(join(fixtureRoot, '人设', `${name}.ini`), 'utf8')),
    ),
  ];
  const result = reconcileWorldbookStatData({}, real).data;
  assert.equal(Object.keys(result.角色.主要角色).length, 3);
  assert.equal(result.系统.版本, '1.0.0');
  assert.ok(result.地图);
  assert.ok(result.角色.user.基础信息);
  for (const name of Object.keys(result.角色.主要角色)) {
    assert.ok(result.手机.微信.账号.user.好友.includes(name));
    assert.ok(result.手机.微信.账号[name].好友.includes('user'));
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

console.log('魔法少女世界书变量初始化验证通过');
