// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import Module from 'node:module';
// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';

const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...args: unknown[]) {
  return originalResolveFilename.call(
    this,
    request.startsWith('@/') ? join(process.cwd(), 'src', request.slice(2)) : request,
    ...args,
  );
};
const worldbookInitPath = require.resolve('../src/手机界面/store/worldbookInit');
require.cache[worldbookInitPath] = {
  id: worldbookInitPath,
  filename: worldbookInitPath,
  loaded: true,
  exports: {
    reconcileWorldbookStatData: (current: any) =>
      current?.作者 === 987 && Object.keys(current).length === 1
        ? { changed: true, data: { 角色: { user: {} }, 手机: { 微信: { 账号: {} } } } }
        : { changed: false, data: current },
  },
} as any;
// 先替换纯组装模块，再载入 Store，验证宿主时序而非资源内容。
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useMagicGirlStatStore } = require('../src/手机界面/store/StatStore');

const entries: any[] = [];
const host = globalThis as any;
const listeners: Record<string, Array<() => void>> = {};
let chatId = 'chat-a';
let current: any = null;
let writes = 0;
let readWorldbook: () => Promise<typeof entries> = async () => entries;
host.SillyTavern = { getCurrentChatId: () => chatId };
host.waitGlobalInitialized = async () => undefined;
host.getCharWorldbookNames = () => ({ primary: '主世界书' });
host.getWorldbook = () => readWorldbook();
host.getLastMessageId = () => 0;
host.getChatMessages = () => [];
host.getScriptId = () => 'phone-test';
host.getVariables = () => ({});
host.tavern_events = new Proxy({}, { get: (_, key: string) => key });
host.eventOn = (name: string, listener: () => void) => (listeners[name] ??= []).push(listener);
host.Mvu = {
  getMvuData: () => current,
  replaceMvuData: async (next: any) => {
    writes++;
    current = next;
  },
};
host.eventEmit = async () => undefined;
setActivePinia(createPinia());
const store = useMagicGirlStatStore();
const cleanup = store.initialize();

async function main() {
  // 脚本启动即开始检查；新聊天楼层晚到时无需点击手机。
  assert.equal(writes, 0);
  current = { stat_data: { 作者: 987 } };
  await new Promise(resolve => setTimeout(resolve, 1150));
  assert.equal(writes, 1);
  assert.ok(current.stat_data.角色.user);
  assert.equal(store.initializationNoticePending, true);
  store.setPhoneOpen(true);
  assert.equal(store.initializationNoticePending, false);

  // 手机保持打开时切换聊天，新楼层晚到仍会初始化。
  chatId = 'chat-b';
  current = null;
  for (const listener of listeners.CHAT_CHANGED) listener();
  current = { stat_data: { 作者: 987 } };
  await new Promise(resolve => setTimeout(resolve, 1150));
  assert.equal(writes, 2);
  assert.equal(store.initializationNoticePending, false);

  // 世界书读取期间换聊天，旧检查不得写入新聊天。
  chatId = 'chat-c';
  current = { stat_data: { 作者: 987 } };
  let release!: (value: typeof entries) => void;
  readWorldbook = () => new Promise(resolve => (release = resolve));
  for (const listener of listeners.CHAT_CHANGED) listener();
  await Promise.resolve();
  readWorldbook = async () => entries;
  chatId = 'chat-d';
  for (const listener of listeners.CHAT_CHANGED) listener();
  release(entries);
  await Promise.resolve();
  assert.equal(writes, 2);
  assert.deepEqual(current.stat_data, { 作者: 987 });
  await new Promise(resolve => setTimeout(resolve, 1150));
  assert.equal(writes, 3);
  store.setPhoneOpen(false);
  chatId = 'chat-e';
  current = { stat_data: { 作者: 987 } };
  for (const listener of listeners.CHAT_CHANGED) listener();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(writes, 4);
  assert.equal(store.initializationNoticePending, true);
  cleanup();
  console.log('手机自动轮询、提示状态与聊天切换验证通过');
}

void main().catch(error => {
  store.setPhoneOpen(false);
  cleanup();
  console.error(error);
  process.exitCode = 1;
});
