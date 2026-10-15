/* eslint-disable import-x/no-nodejs-modules -- 本地宿主事务与聊天入口回归。 */
import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import * as Vue from 'vue';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';
import {
  organizationNoticeKey,
  organizationNoticeAccount,
  organizationWeChatView,
} from '../src/手机界面/apps/witch/organizationExchange';
import { applyWeChatLogs } from '../src/手机界面/apps/wechat/wechatData';
import { createPinia, setActivePinia } from 'pinia';

const resolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...args: unknown[]) {
  return resolveFilename.call(
    this,
    request.startsWith('@/') ? path.join(process.cwd(), 'src', request.slice(2)) : request,
    ...args,
  );
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useMagicGirlStatStore } = require('../src/手机界面/store/StatStore');
const host = globalThis as any;
const chat = '私聊:user&好友';
const time = '2026-10-04T10:00[7]';
const account = (friends: string[]) => ({ 昵称: '账号', 头像: '', 表情包: {}, 好友: friends });
const fixture = (money = -2000, points = 5) => ({
  世界: { 时间: time },
  角色: { user: { 金钱: money, 恶堕积分: points, 评级贡献: 0, 当前评级: 'D' }, 主要角色: {}, 次要角色: {} },
  手机: {
    微信: {
      账号: { user: account(['好友']), 好友: account(['user']) },
      会话: { [chat]: { 类型: '私聊', 成员: ['user', '好友'], 消息: {} } },
      准备发送: null,
    },
  },
});
let data: any = fixture();
let message = '原正文';
let failMvu = false;
let failMessage = false;
let generationCount = 0;
const listeners: Record<string, Array<(id?: number) => void>> = {};
host.waitGlobalInitialized = async () => undefined;
host.getLastMessageId = () => 7;
host.getChatMessages = () => [{ message_id: 7, role: 'assistant', message }];
host.setChatMessages = async ([edit]: any[]) => {
  if (failMessage) throw new Error('正文写入失败');
  message = edit.message;
};
host.Mvu = {
  getMvuData: () => ({ stat_data: data }),
  replaceMvuData: async (next: any) => {
    if (failMvu) throw new Error('变量写入失败');
    data = next.stat_data;
  },
};
host.SillyTavern = { getCurrentChatId: () => 'wallet-test' };
host.getVariables = () => ({});
host.updateVariablesWith = () => undefined;
host.getScriptId = () => 'wallet-test';
host.getCharWorldbookNames = () => ({ primary: 'test' });
host.getWorldbook = async () => [];
host.tavern_events = new Proxy({}, { get: (_, name) => name });
host.eventOn = (name: string, callback: (id?: number) => void) => (listeners[name] ??= []).push(callback);
host.eventEmit = async (name: string) => {
  if (name === 'Chat_On_WeChat') generationCount++;
};
host.window = { parent: { document: { getElementById: () => null } } };
setActivePinia(createPinia());
const store = useMagicGirlStatStore();
const dispose = store.initialize();
const drain = () => new Promise(resolve => setTimeout(resolve, 30));
const messageEvent = (id: number, sender: string, content: string[]) => ({
  类型: '消息',
  楼层ID: id,
  会话: chat,
  发送者: sender,
  时间: time,
  内容: content,
});
async function deliver(events: object[]) {
  message = `<WeChatLog>${JSON.stringify({ 事件: events })}</WeChatLog>`;
  for (const listener of listeners.MESSAGE_RECEIVED ?? []) listener(7);
  await drain();
}
async function reset(money = -2000, points = 5) {
  await drain();
  data = fixture(money, points);
  message = '原正文';
  failMvu = failMessage = false;
  store.refresh();
}
async function main() {
  await drain();
  await store.sendWeChatMessage(chat, ['你好']);
  await store.sendWeChatMessage(chat, ['<表情包>气笑了</表情包>']);
  assert.deepEqual(data.手机.微信.准备发送.内容, ['你好', '<表情包>气笑了</表情包>']);
  await store.confirmWeChatSend();
  assert.equal(generationCount, 1);
  await deliver([messageEvent(1, 'user', ['你好', '<表情包>气笑了</表情包>'])]);
  assert.equal(store.wechatLogError, '');
  assert.equal(data.手机.微信.准备发送, null);
  assert.equal(Object.keys(data.手机.微信.会话[chat].消息).length, 1);
  assert.equal(data.角色.user.金钱, -2000);
  await deliver([messageEvent(2, '好友', ['收到'])]);
  assert.equal(Object.keys(data.手机.微信.会话[chat].消息).length, 2);
  assert.equal(data.角色.user.金钱, -2000);
  await reset(-1.234);
  await store.sendWeChatMessage(chat, ['不应改写余额']);
  await store.discardWeChatDraft();
  assert.equal(data.角色.user.金钱, -1.234, '非款项操作不归零或舍入余额');

  // 负余额下收款、退款，即使仍负数也提交；款项只结算一次。
  await reset();
  await deliver([messageEvent(1, '好友', ['<转账 金额="100">还你</转账>'])]);
  const operation = (操作: string, 操作者: string) => ({
    类型: '操作',
    会话: chat,
    操作,
    操作者,
    目标: { 楼层ID: 1, 内容下标: 0 },
  });
  await store.performWeChatOperation(operation('领取转账', 'user'));
  assert.equal(data.角色.user.金钱, -1900);
  await assert.rejects(store.performWeChatOperation(operation('领取转账', 'user')));
  assert.equal(data.角色.user.金钱, -1900);
  await reset();
  data.手机.微信.会话[chat].消息 = { '1': { 发送者: 'user', 时间: time, 内容: ['<转账 金额="100">旧款</转账>'] } };
  await store.performWeChatOperation(operation('退回转账', '好友'));
  assert.equal(data.角色.user.金钱, -1900);

  for (const money of [-2000, 0, 99]) {
    await reset(money);
    await store.sendWeChatMessage(chat, ['<转账 金额="100">付款</转账>']);
    await store.confirmWeChatSend();
    await deliver([messageEvent(1, 'user', ['<转账 金额="100">付款</转账>'])]);
    assert.match(store.wechatLogError, /余额不足/);
    assert.equal(data.角色.user.金钱, money);
    assert.equal(Object.keys(data.手机.微信.会话[chat].消息).length, 0);
    assert.ok(data.手机.微信.准备发送, '付款失败保留待发送');
  }
  await reset(100);
  await deliver([messageEvent(1, 'user', ['<转账 金额="100">付款</转账>'])]);
  assert.equal(data.角色.user.金钱, 0);
  await deliver([messageEvent(1, 'user', ['<转账 金额="100">付款</转账>'])]);
  assert.equal(data.角色.user.金钱, 0, '日志重放不重复扣款');
  await reset(0);
  await deliver([
    messageEvent(1, 'user', ['<转账 金额="100">先付款</转账>']),
    { 类型: '操作', 楼层ID: 2, 时间: time, ...operation('退回转账', '好友') },
  ]);
  assert.match(store.wechatLogError, /余额不足/, '后续退款不能掩盖当前付款透支');
  assert.equal(Object.keys(data.手机.微信.会话[chat].消息).length, 0);

  await reset();
  await store.exchangePointsForMoney(1);
  assert.equal(data.角色.user.恶堕积分, 4);
  assert.equal(data.角色.user.金钱, -1000);
  assert.equal(data.手机.组织兑换通知.length, 1);
  assert.deepEqual(data.手机.组织兑换通知[0], { 时间: time, 点数: 1, 日元: 1000 });
  assert.equal(data.手机.微信.账号[organizationNoticeAccount], undefined, '假好友不进入真实账号');
  assert.equal(data.手机.微信.会话[organizationNoticeKey], undefined, '通知不进入普通消息协议');
  assert.equal(store.wechatNotification.key, organizationNoticeKey, '通知触发 Weline 提醒');
  assert.ok(store.unreadChatKeys.includes(organizationNoticeKey));
  store.setActiveWeChatConversation(organizationNoticeKey);
  assert.equal(store.wechatNotification, null);
  assert.ok(!store.unreadChatKeys.includes(organizationNoticeKey), '阅读通知清除未读');
  store.setActiveWeChatConversation(null);
  await assert.rejects(store.sendWeChatMessage(organizationNoticeKey, ['回复']));
  await assert.rejects(
    store.performWeChatOperation({
      类型: '操作',
      会话: organizationNoticeKey,
      操作: '拍一拍',
      操作者: 'user',
      目标: organizationNoticeAccount,
    }),
  );
  await assert.rejects(
    store.performWeChatOperation({
      类型: '操作',
      会话: organizationNoticeKey,
      操作: '领取转账',
      操作者: 'user',
      目标: { 楼层ID: 1, 内容下标: 0 },
    }),
  );
  assert.equal(data.角色.user.金钱, -1000, '阅读和互动失败不重复加钱');
  await assert.rejects(store.deleteWeChatFloor(organizationNoticeKey, 1), /无法删除/);
  await assert.rejects(store.requestWeChatFriend(organizationNoticeAccount, '添加好友'));
  assert.throws(
    () =>
      applyWeChatLogs(data.手机.微信, [
        { 事件: [{ ...messageEvent(1, 'user', ['伪造通知']), 会话: organizationNoticeKey }] },
      ]),
    /不能由聊天正文写入/,
  );
  assert.equal(data.手机.组织兑换通知.length, 1, '普通聊天操作与伪造日志不能改写通知');
  assert.match(message, /消耗1点恶堕积分，兑换1000日元/);
  await store.exchangePointsForMoney(4);
  assert.equal(data.角色.user.恶堕积分, 0);
  assert.equal(data.角色.user.金钱, 3000);
  for (const points of [1, 0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    const before = structuredClone(data);
    await assert.rejects(store.exchangePointsForMoney(points));
    assert.deepEqual(data, before);
  }
  await reset(-0.25, 2);
  await Promise.all([store.exchangePointsForMoney(1), store.exchangePointsForMoney(1)]);
  assert.equal(data.角色.user.金钱, 1999.75);
  assert.equal(data.角色.user.恶堕积分, 0, '排队兑换使用最新余额');
  for (const kind of ['正文', '变量']) {
    await reset();
    const before = structuredClone(data);
    failMessage = kind === '正文';
    failMvu = kind === '变量';
    await assert.rejects(store.exchangePointsForMoney(1), /写入失败/);
    assert.deepEqual(data, before, '失败不消耗积分或增加金钱');
    assert.equal(message, '原正文', '失败撤回兑换日志');
    failMessage = failMvu = false;
    await store.exchangePointsForMoney(1);
    assert.equal(data.角色.user.恶堕积分, 4, '可重试且只扣一次');
  }
  await validateWalletUi();
  console.info('Weline 钱包回归通过：负余额聊天、收退款、组织兑换、只读通知与事务回滚。');
}

function compilePage(file: string) {
  const filename = path.resolve(file);
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: 'wallet-test' });
  const template = compileTemplate({
    source: descriptor.template!.content,
    filename,
    id: 'wallet-test',
    compilerOptions: { bindingMetadata: script.bindings },
  });
  assert.deepEqual(template.errors, []);
  const compiled = { exports: {} as any };
  runInNewContext(
    transpileModule(`${script.content}\n${template.code}`, {
      compilerOptions: { target: ScriptTarget.ES2020, module: ModuleKind.CommonJS },
    }).outputText,
    {
      module: compiled,
      exports: compiled.exports,
      require(id: string) {
        if (id === 'vue') return { ...Vue, onMounted() {}, onUnmounted() {} };
        if (id.endsWith('StatStore')) return { useMagicGirlStatStore: () => store };
        if (id.endsWith('.vue')) return { default: { name: id } };
        if (id.endsWith('.css')) return {};
        // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-dynamic-require -- 加载正式组件的相对依赖。
        return require(path.resolve(path.dirname(filename), id));
      },
      Error,
      getVariables: host.getVariables,
      getScriptId: host.getScriptId,
    },
  );
  return compiled.exports;
}
async function validateWalletUi() {
  const compiled = compilePage('src/手机界面/apps/witch/PointExchange.vue');
  const scope = Vue.effectScope();
  const state = scope.run(() => compiled.default.setup({}, { expose() {}, emit() {} }));
  const render = () => compiled.render({}, [], {}, Vue.proxyRefs(state));
  const find = (node: any, predicate: (value: any) => boolean): any => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const result = find(child, predicate);
        if (result) return result;
      }
    } else if (node && typeof node === 'object') {
      if (predicate(node)) return node;
      if (typeof node.children?.default === 'function') return find(node.children.default(), predicate);
      return find(node.children, predicate);
    }
  };
  await reset(-2000, 2);
  store.refresh();
  await Vue.nextTick();
  const form = () => find(render(), node => node.type === 'form' && node.props.class.includes('witch-exchange-card'));
  const button = () => find(form(), node => node.type === 'button');
  assert.ok(form(), '组织 App 显示兑换入口');
  state.exchangeAmount.value = '0.5';
  assert.equal(button().props.disabled, true, '小数点数不能提交');
  state.exchangeAmount.value = '3';
  assert.equal(button().props.disabled, true, '积分不足不能提交');
  state.exchangeAmount.value = '1';
  await Vue.nextTick();
  assert.equal(button().props.disabled, false);
  const submit = form().props.onSubmit;
  const pending = submit({ preventDefault() {} });
  assert.equal(button().props.disabled, true, '写入时禁用兑换按钮');
  await submit({ preventDefault() {} });
  await pending;
  assert.equal(data.角色.user.恶堕积分, 1, '重复点击不重复扣点');
  assert.equal(data.角色.user.金钱, -1000);
  assert.equal(state.exchangeNotice.value, '￥1000 已到账，通知已发送至 Weline。');
  assert.equal(data.手机.组织兑换通知.length, 1, '重复点击不重复发通知');
  failMvu = true;
  await submit({ preventDefault() {} });
  assert.match(state.error.value, /变量写入失败/);
  assert.equal(state.exchangeNotice.value, '');
  assert.equal(state.exchangingPoints.value, false, '失败后可重试');
  failMvu = false;
  const wechatPage = compilePage('src/手机界面/apps/wechat/WeChat.vue');
  const wechatState = scope.run(() => wechatPage.default.setup({}, { expose() {}, emit() {} }));
  const renderWechat = () => wechatPage.render({}, [], {}, Vue.proxyRefs(wechatState));
  wechatState.accountPage.value = 'wallet';
  await Vue.nextTick();
  assert.equal(
    find(renderWechat(), node => node.type === 'form'),
    undefined,
    'Weline 钱包已移除兑换表单',
  );
  assert.ok(wechatState.chats.value.some((item: any) => item.key === organizationNoticeKey));
  assert.ok(!wechatState.contacts.value.some(([id]: [string]) => id === organizationNoticeAccount));
  assert.ok(!wechatState.cardCandidates.value.some(([id]: [string]) => id === organizationNoticeAccount));
  assert.ok(!wechatState.filteredForwardChats.value.some((item: any) => item.key === organizationNoticeKey));
  wechatState.accountPage.value = null;
  wechatState.openChat(organizationNoticeKey);
  await Vue.nextTick();
  assert.ok(
    find(renderWechat(), node => node.type?.name?.endsWith('OrganizationNotice.vue')),
    '假好友打开只读通知页',
  );
  assert.equal(
    find(renderWechat(), node => node.type === 'form' || node.type === 'input'),
    undefined,
    '通知页没有消息输入或互动表单',
  );
  const noticePage = compilePage('src/手机界面/apps/wechat/OrganizationNotice.vue');
  let closed = false;
  const noticeState = scope.run(() =>
    noticePage.default.setup(
      { notices: data.手机.组织兑换通知, worldTime: time, accounts: organizationWeChatView(data)!.账号 },
      {
        expose() {},
        emit() {
          closed = true;
        },
      },
    ),
  );
  const noticeNode = noticePage.render(
    {},
    [],
    { notices: data.手机.组织兑换通知, worldTime: time, accounts: organizationWeChatView(data)!.账号 },
    Vue.proxyRefs(noticeState),
  );
  assert.equal(
    find(noticeNode, node => node.type === 'input' || node.type === 'form'),
    undefined,
  );
  const noticeButton = find(noticeNode, node => node.type === 'button');
  assert.equal(noticeButton.props['aria-label'], '返回 Weline', '只读页唯一按钮为返回');
  assert.equal(
    find(noticeNode, node => node.type === 'button' && node.props['aria-label'] !== '返回 Weline'),
    undefined,
  );
  assert.equal(
    find(noticeNode, node => node.props?.class?.includes?.('wx-payment-done')).props.onClick,
    undefined,
    '到账卡片无点击或领款动作',
  );
  noticeButton.props.onClick();
  assert.equal(closed, true);
  const witchPage = compilePage('src/手机界面/apps/witch/WitchApp.vue');
  const witchState = scope.run(() => witchPage.default.setup({}, { expose() {}, emit() {} }));
  witchState.selectTab('shop');
  const renderWitch = () => witchPage.render({}, [], {}, Vue.proxyRefs(witchState));
  const exchangeTab = find(
    renderWitch(),
    node => node.type === 'button' && typeof node.children === 'string' && node.children.trim() === '兑换',
  );
  assert.ok(exchangeTab, '商店提供兑换分类');
  exchangeTab.props.onClick();
  assert.ok(find(renderWitch(), node => node.type?.name?.endsWith('PointExchange.vue')));
  scope.stop();
}
void main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(dispose);
