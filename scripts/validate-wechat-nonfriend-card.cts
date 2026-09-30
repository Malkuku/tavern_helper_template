// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-nodejs-modules
const nodeModule = require('node:module') as any;
const resolveFilename = nodeModule._resolveFilename;
nodeModule._resolveFilename = function (request: string, ...args: unknown[]) {
  return resolveFilename.call(
    this,
    request.startsWith('@/') ? join(process.cwd(), 'src', request.slice(2)) : request,
    ...args,
  );
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useMagicGirlStatStore } =
  require('../src/手机界面/store/StatStore') as typeof import('../src/手机界面/store/StatStore');

const chat = '私聊:user&好友';
const account = (name: string, friends: string[]) => ({ 昵称: name, 头像: '', 表情包: {}, 好友: friends });
const fixture = () => ({
  世界: { 时间: '2026-09-30T10:00[3]' },
  角色: { user: { 金钱: 100 }, 主要角色: { 陌生人: {} }, 次要角色: {} },
  手机: {
    微信: {
      账号: { user: account('我', ['好友']), 好友: account('好友', ['user']) },
      会话: { [chat]: { 类型: '私聊', 成员: ['user', '好友'], 消息: [] } },
      准备发送: null,
    },
  },
});

let data: any = fixture();
const host = globalThis as any;
host.waitGlobalInitialized = async () => undefined;
host.getLastMessageId = () => 0;
host.getVariables = () => null;
host.eventEmit = async () => undefined;
host.Mvu = {
  getMvuData: () => ({ stat_data: data }),
  replaceMvuData: async (next: any) => {
    data = next.stat_data;
  },
};

setActivePinia(createPinia());
const store = useMagicGirlStatStore();

async function main() {
  await store.sendWeChatMessage(chat, ['<名片 角色="陌生人">'], undefined, {
    id: '陌生人',
    name: '陌生人',
    avatar: 'avatar',
  });
  assert.deepEqual(data.手机.微信.账号.陌生人.好友, [], '发送非好友名片不建立好友关系');
  assert.equal(data.手机.微信.账号.陌生人.头像, 'avatar');
  assert.deepEqual(data.手机.微信.准备发送.内容, ['<名片 角色="陌生人">']);
  assert.equal(data.手机.微信.准备发送.已确认, false);

  data = fixture();
  await assert.rejects(
    store.sendWeChatMessage(chat, ['<名片 角色="不存在">'], undefined, {
      id: '不存在',
      name: '不存在',
      avatar: '',
    }),
    /角色已不存在/,
  );
  assert.equal(data.手机.微信.账号.不存在, undefined, '角色消失时不创建空账号');
  assert.equal(data.手机.微信.准备发送, null, '角色消失时不写入待发送消息');

  data = fixture();
  data.手机.微信.账号.user.好友 = [];
  await assert.rejects(
    store.sendWeChatMessage(chat, ['<名片 角色="陌生人">'], undefined, {
      id: '陌生人',
      name: '陌生人',
      avatar: '',
    }),
    /非好友不能发送普通私聊消息/,
  );
  assert.equal(data.手机.微信.账号.陌生人, undefined, '收件人不合规时不创建名片账号');
  assert.equal(data.手机.微信.准备发送, null);

  console.info('Weline 非好友角色名片发送验证通过。');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
