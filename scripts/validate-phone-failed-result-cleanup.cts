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
const storeModule = require('../src/手机界面/store/StatStore') as typeof import('../src/手机界面/store/StatStore');
const { useMagicGirlStatStore } = storeModule;

const host = globalThis as any;
const listeners = new Map<string, ((id?: number) => void)[]>();
const tag = '<shopVariable>{}</shopVariable>';
const validTag = `<shopVariable>${JSON.stringify({
  新商品: { 描述: '新商品', 作用: '可使用', 评级: 'D', 价格: 5, 数量: 1, 耐久: 1 },
})}</shopVariable>`;
let message = '正文';
let data: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: { 商店下次刷新时间: '', 商店主动刷新次数: 0 },
  角色: { user: { 恶堕积分: 100, 物品: {} } },
  仓库: {},
  商店: { 原商品: { 描述: '原商品', 作用: '可使用', 评级: 'D', 价格: 5, 数量: 1, 耐久: 1 } },
  手机: { 定向刷新: null },
};
let cleanupAttempts = 0;
let failFirstCleanup = true;
let generationCount = 0;

host.waitGlobalInitialized = async () => undefined;
host.getLastMessageId = () => 7;
host.getChatMessages = () => [{ message_id: 7, role: 'assistant', message }];
host.setChatMessages = async ([edit]: any[]) => {
  cleanupAttempts++;
  if (failFirstCleanup) {
    failFirstCleanup = false;
    throw new Error('宿主暂时无法写入正文');
  }
  message = edit.message;
};
host.Mvu = {
  getMvuData: () => ({ stat_data: data }),
  replaceMvuData: async (next: any) => {
    data = next.stat_data;
  },
};
host.SillyTavern = { getCurrentChatId: () => 'test-chat' };
host.getCharWorldbookNames = () => ({ primary: 'test-worldbook' });
host.getWorldbook = async () => [];
host.tavern_events = {
  MESSAGE_DELETED: 'message_deleted',
  CHAT_CHANGED: 'chat_changed',
  GENERATION_ENDED: 'generation_ended',
  GENERATION_STOPPED: 'generation_stopped',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_UPDATED: 'message_updated',
};
host.getVariables = () => null;
host.eventOn = (name: string, callback: (id?: number) => void) => {
  listeners.set(name, [...(listeners.get(name) ?? []), callback]);
};
host.eventEmit = async (name: string) => {
  if (name !== 'Chat_On_ItemShop') return;
  generationCount++;
  const deliver = () => {
    message += generationCount === 1 ? tag : validTag;
    for (const listener of listeners.get('message_received') ?? []) listener(7);
  };
  if (generationCount === 1) deliver();
  else setTimeout(deliver, 1200);
};

setActivePinia(createPinia());
const store = useMagicGirlStatStore();
const dispose = store.initialize();

async function until(check: () => boolean, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!check() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(check(), '等待结果超时');
}

async function main() {
  await store.refreshItemShop();
  await until(() => cleanupAttempts >= 1);
  assert.equal(data.商店.原商品.数量, 1, '无可用商品不清空原货架');
  assert.equal(data.系统.商店主动刷新次数, 0, '无可用商品不计次');
  assert.match(message, /shopVariable/, '首次自动清理失败时标签暂存');
  await store.refreshItemShop();
  await new Promise(resolve => setTimeout(resolve, 1050));
  assert.equal(cleanupAttempts, 1, '新一轮生成期间暂停旧标签清理');
  await until(() => !!data.商店.新商品);
  await until(() => cleanupAttempts >= 2 && !message.includes(tag));
  assert.equal(message, `正文${validTag}`, '旧失败标签被清理，新结果保留并正常结算');
  assert.equal(data.系统.商店主动刷新次数, 1);
  console.info('手机失败生成标签自动清理与重试验证通过。');
}

void main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => dispose());
