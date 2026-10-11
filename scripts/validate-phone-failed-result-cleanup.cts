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
const validSkillTag = `<skillVariable>${JSON.stringify({
  新技能: { 描述: '新技能', 作用: '可使用', 评级: 'D', 价格: 5 },
})}</skillVariable>`;
const validTaskTag = `<questVariable>${JSON.stringify({
  新任务: { 描述: '新任务', 目标: '完成目标', 评级: 'D', 奖励: 10, 失败惩罚: '无' },
})}</questVariable>`;
let message = '正文';
let data: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: {
    商店下次刷新时间: '',
    商店主动刷新次数: 0,
    技能下次刷新时间: '',
    技能主动刷新次数: 0,
    任务下次刷新时间: '',
    任务主动刷新次数: 0,
  },
  角色: { 主要角色: {}, 次要角色: {}, user: { 当前评级: 'D', 评级贡献: 0, 恶堕积分: 100, 物品: {}, 技能: {} } },
  仓库: {},
  商店: { 原商品: { 描述: '原商品', 作用: '可使用', 评级: 'D', 价格: 5, 数量: 1, 耐久: 1 } },
  技能商店: {},
  任务: {},
  任务候选: {},
  手机: { 定向刷新: null, 恶堕奖励: { 已奖励等级: {}, 邮件: [] } },
};
let cleanupAttempts = 0;
let failFirstCleanup = true;
let generationCount = 0;
let tavernBusy = false;

const sendButton = {
  hasAttribute: () => false,
  classList: { contains: () => false },
};
host.window = {
  parent: { document: { getElementById: () => sendButton } },
  getComputedStyle: () => ({ display: tavernBusy ? 'none' : 'block', visibility: 'visible' }),
};
host.MutationObserver = class {
  observe() {}
  disconnect() {}
};

host.waitGlobalInitialized = async () => undefined;
host.getLastMessageId = () => 7;
const messageRole = process.argv.includes('--user-floor') ? 'user' : 'assistant';
host.getChatMessages = () => [{ message_id: 7, role: messageRole, message }];
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
  if (name === 'Chat_On_Quest') {
    setTimeout(() => {
      message += validTaskTag;
    }, 1200);
    return;
  }
  if (name === 'Chat_On_SkillShop') {
    setTimeout(() => {
      message += validSkillTag;
    }, 1200);
    return;
  }
  if (name !== 'Chat_On_ItemShop') return;
  generationCount++;
  const deliver = () => {
    message += generationCount === 1 ? tag : validTag;
    if (generationCount === 3) {
      tavernBusy = false;
      return;
    }
    if (generationCount === 4) return;
    for (const listener of listeners.get('message_received') ?? []) listener(6);
  };
  if (generationCount === 1) deliver();
  else if (generationCount === 2) setTimeout(deliver, 1200);
  else if (generationCount === 3) {
    tavernBusy = true;
    for (const listener of listeners.get('generation_ended') ?? []) listener(6);
    setTimeout(deliver, 5500);
  } else setTimeout(deliver, 1200);
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
  assert.ok(store.statData?.商店.新商品, '写回成功后商店页面读取同一份 MVU 货架');
  await until(() => cleanupAttempts >= 2 && !message.includes(tag));
  assert.ok(message.startsWith(`正文${validTag}`), '旧失败标签被清理，新结果保留并正常结算');
  assert.match(message.slice(`正文${validTag}`.length), /<JSONPatch>/, '货架结算留下可重放的正文差分');
  assert.equal(data.系统.商店主动刷新次数, 1);
  await store.refreshItemShop();
  await new Promise(resolve => setTimeout(resolve, 5100));
  assert.equal(store.itemRefreshing, true, '生成结束五秒后正文仍可继续写入结果');
  await until(() => data.系统.商店主动刷新次数 === 2);
  assert.equal(store.itemRefreshError, '', '迟到结果不应被误报为没有返回');
  await store.refreshItemShop();
  await until(() => data.系统.商店主动刷新次数 === 3);
  assert.equal(store.itemRefreshError, '', '正文写入没有消息或按钮事件时仍应接收结果');
  await store.refreshSkillShop();
  await until(() => data.系统.技能主动刷新次数 === 1);
  assert.ok(data.技能商店.新技能, '无通知的技能正文写入后应上架');
  assert.equal(store.skillRefreshError, '');
  await store.refreshTaskBoard();
  await until(() => data.系统.任务主动刷新次数 === 1);
  assert.ok(data.任务候选.新任务, '无通知的任务正文写入后应成为候选');
  assert.equal(store.taskRefreshError, '');

  function emit(name: string) {
    for (const listener of listeners.get(name) ?? []) listener(7);
  }
  let stopCalls = 0;
  host.SillyTavern.stopGeneration = () => {
    stopCalls++;
    tavernBusy = false;
    emit('generation_stopped');
    return true;
  };
  const generationEvents = ['Chat_On_SkillShop', 'Chat_On_ItemShop', 'Chat_On_Quest'];
  host.eventEmit = async (name: string) => {
    if (generationEvents.includes(name)) tavernBusy = true;
  };
  const refreshCases = [
    {
      start: () => store.refreshSkillShop('防御技能'),
      cancel: () => store.cancelSkillRefresh(),
      refreshing: () => store.skillRefreshing,
      error: () => store.skillRefreshError,
      result: validSkillTag,
    },
    {
      start: () => store.refreshItemShop('治疗道具'),
      cancel: () => store.cancelItemRefresh(),
      refreshing: () => store.itemRefreshing,
      error: () => store.itemRefreshError,
      result: validTag,
    },
    {
      start: () => store.refreshTaskBoard(),
      cancel: () => store.cancelTaskRefresh(),
      refreshing: () => store.taskRefreshing,
      error: () => store.taskRefreshError,
      result: validTaskTag,
    },
  ];
  for (const scenario of refreshCases) {
    for (const source of ['手机', '酒馆']) {
      const before = structuredClone(data);
      const previousStopCalls = stopCalls;
      await scenario.start();
      assert.equal(scenario.refreshing(), true);
      if (source === '手机') scenario.cancel();
      else {
        // 完整结果已到达并排队时，停止事件也必须优先取消结算。
        message += scenario.result;
        emit('message_received');
        host.SillyTavern.stopGeneration();
      }
      assert.equal(scenario.refreshing(), false, `${source}取消应立即结束手机刷新`);
      assert.equal(tavernBusy, false, '手机取消也应停止宿主生成');
      assert.equal(stopCalls, previousStopCalls + 1, '停止事件不能递归调用停止接口');
      assert.match(scenario.error(), /已取消生成/);
      await until(() => data.手机.定向刷新 === null);
      message += scenario.result;
      emit('generation_ended');
      emit('message_received');
      emit('message_updated');
      await new Promise(resolve => setTimeout(resolve, 600));
      assert.deepEqual(data, before, '取消后排队和迟到结果均不得改货架、扣费或计次');
      scenario.cancel();
      assert.equal(stopCalls, previousStopCalls + 1, '无活动刷新时取消不影响宿主');
    }
  }

  for (const scenario of refreshCases) {
    let rejectGeneration!: (error: Error) => void;
    host.eventEmit = (name: string) =>
      generationEvents.includes(name)
        ? new Promise((_resolve, reject) => (rejectGeneration = reject))
        : Promise.resolve();
    const pending = scenario.start();
    await until(() => !!rejectGeneration);
    scenario.cancel();
    rejectGeneration(new Error('生成已中止'));
    await pending;
    assert.equal(scenario.refreshing(), false);
    assert.match(scenario.error(), /已取消生成/, '中止导致的旧事件拒绝不能覆盖取消状态');
    await until(() => data.手机.定向刷新 === null);
  }
  console.info('手机失败标签清理、迟到结果与生成双向取消验证通过。');
}

void main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => dispose());
