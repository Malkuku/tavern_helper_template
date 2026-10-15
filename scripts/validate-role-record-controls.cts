import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import * as Vue from 'vue';
import { parse, compileTemplate } from 'vue/compiler-sfc';
import { changeRuntimeMinorRole } from '../src/手机界面/apps/roleEditor/roleAssets';
import { completeMinorRole } from '../src/手机界面/store/minorStages';
import { addWechatAccount } from '../src/手机界面/apps/wechat/accountManagement';
import { wechatRoleAvatar } from '../src/尘史使徒/UI/components/common/roleAvatarFallback';
import { applyWeChatLogs, parseWeChatLogs } from '../src/手机界面/apps/wechat/wechatData';

const part = () => ({ 当前状态: '状态样例', 特征: '特征样例', 开发程度: '开发样例' });
const character = {
  名称: '测试',
  名称检索词: ['测试'],
  身份: ['学生'],
  当前评级: '',
  背景: '',
  外貌: '',
  性格: '',
  身体: { 特殊状态: [], 小穴: part(), 口穴: part(), 菊穴: part(), 胸部: part() },
  能力描述: [],
};
const { 名称, ...fields } = character;
const role = { ...fields, 区域检索词: [], 在场: true };
let chatId = 'chat-a';
let current: any;
let writes = 0;
let failWrite = false;
let messageText = '原正文';
const reset = (minor = role) => {
  current = {
    stat_data: {
      角色: { 主要角色: { 主要: { marker: true } }, 次要角色: { 测试: structuredClone(minor) } },
      手机: { 微信: { 账号: { 测试: {} }, 会话: { 历史: {} } } },
    },
  };
  writes = 0;
  failWrite = false;
  chatId = 'chat-a';
  messageText = '原正文';
};
const env = {
  ...Vue,
  onMounted: () => {},
  onUnmounted: () => {},
  $1: { 角色: [character] },
  changeRuntimeMinorRole,
  completeMinorRole,
  addWechatAccount,
  wechatRoleAvatar,
  structuredClone,
  loadMinorStageTemplates: async () => ({
    好感度: { 当前等级: 0, 累计经验: 0, 描述: { '0': '初始好感' } },
    恶堕度: { 当前等级: 0, 累计经验: 0, 描述: { '0': '初始恶堕' } },
  }),
  getCurrentMessageId: () => 3,
  getChatMessages: () => [{ message: messageText }],
  setChatMessages: async (messages: any[]) => {
    messageText = messages[0].message;
  },
  SillyTavern: { getCurrentChatId: () => chatId },
  waitGlobalInitialized: async () => {},
  getLastMessageId: () => 5,
  eventEmit: async () => {},
  Mvu: {
    getMvuData: () => structuredClone(current),
    replaceMvuData: async (next: any, target: any) => {
      assert.equal(target.message_id, 5);
      if (failWrite) throw new Error('写入失败样例');
      current = structuredClone(next);
      writes++;
    },
  },
  defineEmits: () => () => {},
  defineExpose: () => {},
  klona: (value: any) => structuredClone(Vue.toRaw(value)),
  roleAvatarStyleNames: [],
  getPhoneRuntimeRoles: async () => structuredClone(current.stat_data.角色),
  useMagicGirlStatStore: () => ({
    changeRuntimeMinorRole: async (key: string, original: any, next: any) => {
      changeRuntimeMinorRole(current.stat_data, key, Vue.toRaw(original), next);
      writes++;
    },
  }),
};
function setup(file: string, names: string[], overrides = {}) {
  const descriptor = parse(readFileSync(file, 'utf8')).descriptor;
  const script = descriptor.scriptSetup!.content.replace(/^import\s[\s\S]*?;\s*$/gm, '');
  const context: any = { ...env, ...overrides };
  runInNewContext(
    transpileModule(`${script}\nglobalThis.fixture = { ${names.join(',')} };`, {
      compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return { api: context.fixture, descriptor };
}

async function main() {
  reset();
  const { api, descriptor } = setup('src/角色生成/App.vue', [
    'fetchGlobalData',
    'requestCancelRecord',
    'cancelRecord',
    'currentCharacter',
    'characters',
    'selectedName',
    'currentDetailTab',
    'detailTabs',
    'bodyParts',
    'isRecorded',
    'isMinorRecorded',
    'isSaving',
    'feedback',
    'currentMapIndex',
    'cancelRecordOriginal',
    'inputError',
  ]);
  api.fetchGlobalData();
  api.currentDetailTab.value = '性格与状态';
  const template = compileTemplate({ source: descriptor.template!.content, filename: 'App.vue', id: 'test' });
  assert.deepEqual(template.errors, []);
  const renderContext: any = { exports: {}, require: () => Vue };
  runInNewContext(
    transpileModule(template.code, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText,
    renderContext,
  );
  const vnode = renderContext.exports.render(Vue.proxyRefs(api), [], {}, {}, {}, {});
  const texts: string[] = [];
  const collect = (node: any) => {
    if (typeof node === 'string') texts.push(node);
    else if (Array.isArray(node)) node.forEach(collect);
    else if (node?.children) collect(node.children);
  };
  collect(vnode);
  assert.equal(texts.filter(text => text.includes('特征样例')).length, 4);
  assert.equal(texts.filter(text => text.includes('状态样例')).length, 4);
  assert.equal(texts.filter(text => text.includes('开发样例')).length, 4);
  assert.ok(texts.some(text => text.includes('暂无特殊状态')));

  api.requestCancelRecord();
  await api.cancelRecord();
  assert.equal(writes, 1);
  assert.equal(current.stat_data.角色.次要角色.测试, undefined);
  assert.ok(current.stat_data.角色.主要角色.主要);
  assert.ok(current.stat_data.手机.微信.账号.测试);
  assert.ok(current.stat_data.手机.微信.会话.历史);
  assert.equal(api.isRecorded.value, false);
  assert.match(api.feedback.value, /可重新收录/);

  reset();
  api.fetchGlobalData();
  api.requestCancelRecord();
  current.stat_data.角色.次要角色.测试.背景 = '并发修改';
  await api.cancelRecord();
  assert.equal(writes, 0);
  assert.match(api.feedback.value, /其他操作修改/);
  reset();
  api.fetchGlobalData();
  api.requestCancelRecord();
  failWrite = true;
  await api.cancelRecord();
  assert.equal(writes, 0);
  assert.ok(current.stat_data.角色.次要角色.测试);
  assert.match(api.feedback.value, /写入失败样例/);
  reset();
  api.fetchGlobalData();
  api.requestCancelRecord();
  chatId = 'chat-b';
  await api.cancelRecord();
  assert.equal(writes, 0);
  assert.match(api.feedback.value, /聊天已切换/);

  const legacy = { ...role, 身体: undefined, 身体开发状态: [] };
  reset(legacy as any);
  const { api: phone } = setup('src/手机界面/apps/roleEditor/RoleEditor.vue', [
    'runtime',
    'requestMinorDelete',
    'confirmDialog',
    'dialog',
    'runtimeMinorDraft',
    'notice',
    'error',
  ]);
  phone.runtime.value = structuredClone(current.stat_data.角色);
  phone.requestMinorDelete('测试');
  assert.equal(phone.runtimeMinorDraft.value, null);
  assert.equal(phone.dialog.value.kind, 'minor-delete');
  assert.equal(writes, 0); // 提示确认时不删除。
  await phone.confirmDialog();
  assert.equal(writes, 1);
  assert.equal(current.stat_data.角色.次要角色.测试, undefined);
  assert.match(phone.notice.value, /已删除/);
  assert.ok(current.stat_data.手机.微信.账号.测试);
  reset();
  phone.runtime.value = structuredClone(current.stat_data.角色);
  phone.requestMinorDelete('测试');
  chatId = 'chat-b';
  await phone.confirmDialog();
  assert.equal(writes, 0);
  assert.match(phone.error.value, /聊天已切换/);

  const name = '栗原桃香';
  const { api: generated } = setup('src/角色生成/App.vue', ['recordCharacter', 'feedback'], {
    $1: { 角色: [{ ...character, 名称: name }] },
  });
  const prepareRecord = () => {
    reset();
    current.stat_data.角色.次要角色 = {};
    current.stat_data.手机.微信 = {
      账号: { user: { 昵称: '我', 头像: '', 表情包: {}, 好友: [] } },
      会话: {},
      准备发送: null,
    };
  };
  prepareRecord();
  await generated.recordCharacter();
  assert.equal(writes, 1);
  assert.ok(current.stat_data.角色.次要角色[name]);
  const account = current.stat_data.手机.微信.账号[name];
  assert.equal(account.昵称, name);
  assert.equal(account.头像, wechatRoleAvatar(undefined, name));
  assert.deepEqual(account.好友, []);
  assert.deepEqual(account.表情包, {});
  const log = `<WeChatLog>${JSON.stringify({
    事件: [
      {
        类型: '操作',
        楼层ID: 1,
        操作: '好友申请',
        会话: `私聊:user&${name}`,
        时间: '2026-09-28T22:48[1]',
        操作者: name,
        目标: 'user',
        验证消息: '栗原桃香（加了，快通过）',
        会话信息: { 类型: '私聊', 成员: ['user', name] },
      },
      {
        类型: '操作',
        楼层ID: 2,
        操作: '通过好友申请',
        会话: `私聊:user&${name}`,
        时间: '2026-09-28T22:49[1]',
        操作者: 'user',
        目标: name,
      },
      {
        类型: '消息',
        楼层ID: 3,
        会话: `私聊:user&${name}`,
        发送者: name,
        时间: '2026-09-28T22:52[1]',
        内容: ['CH-0482', '密钥是0001850024', '排班表等我回宿舍用平板发，手机里没存pdf'],
      },
    ],
  })}</WeChatLog>`;
  const applied = applyWeChatLogs(current.stat_data.手机.微信, parseWeChatLogs(log));
  assert.equal(Object.keys(applied.会话[`私聊:user&${name}`].消息).length, 3);
  assert.ok(applied.账号.user.好友.includes(name));
  assert.ok(applied.账号[name].好友.includes('user'));

  prepareRecord();
  const existing = { 昵称: '保留昵称', 头像: 'saved-avatar', 表情包: { 笑: 'saved-sticker' }, 好友: ['user'] };
  current.stat_data.手机.微信.账号[name] = structuredClone(existing);
  await generated.recordCharacter();
  assert.equal(writes, 1);
  assert.deepEqual(current.stat_data.手机.微信.账号[name], existing);
  prepareRecord();
  failWrite = true;
  await generated.recordCharacter();
  assert.equal(writes, 0);
  assert.equal(current.stat_data.角色.次要角色[name], undefined);
  assert.equal(current.stat_data.手机.微信.账号[name], undefined);
  assert.equal(messageText, '原正文');
  assert.match(generated.feedback.value, /收录失败/);
  prepareRecord();
  delete current.stat_data.手机.微信;
  await generated.recordCharacter();
  assert.equal(writes, 0);
  assert.equal(current.stat_data.角色.次要角色[name], undefined);
  assert.equal(messageText, '原正文');
  assert.match(generated.feedback.value, /缺少 Weline/);
  console.log('角色身体完整展示、取消收录、手机直接删除旧记录及失败保护验证通过');
  console.log('生成页角色与账号同时收录、保留已有账号、失败回滚及栗原桃香原始微信日志验证通过');
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
