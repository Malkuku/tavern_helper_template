// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { MvuUtil } from '../src/Utils/MvuUtil';
import { statDataPatch } from '../src/Utils/statDataPatch';
import { applyItemRefresh, buyItem } from '../src/手机界面/apps/itemShop/itemShop';

const host = globalThis as any;
const sampleItem = {
  图标: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24Z"/></svg>',
  描述: '测试',
  作用: '测试',
  评级: 'D',
  价格: 2,
  数量: 5,
  耐久: 2,
};
const source = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : `正文<shopVariable>{}</shopVariable><shopVariable>${JSON.stringify({ 温感束缚织带: sampleItem })}</shopVariable>`;
const baseline: any = {
  世界: { 时间: '2026-9-29T07:31[2]' },
  系统: { 商店下次刷新时间: '2026-10-5T00:00[1]', 商店主动刷新次数: 1 },
  角色: { user: { 评级贡献: 0, 恶堕积分: 258, 物品: {} } },
  仓库: {},
  商店: {},
  手机: { 定向刷新: null },
};
let saved: any;
let message: string;
let chatId: string;
let messageId: number;
let writeCount: number;
let notifications: number;
let failText: boolean;
let failData: boolean;
let discardData: boolean;
let failNotification: boolean;
let afterAppend: () => void;

function reset() {
  saved = structuredClone(baseline);
  message = source;
  chatId = 'original-chat';
  messageId = 6;
  writeCount = notifications = 0;
  failText = failData = discardData = failNotification = false;
  afterAppend = () => undefined;
}

host.waitGlobalInitialized = async () => undefined;
host.SillyTavern = { getCurrentChatId: () => chatId };
host.getLastMessageId = () => messageId;
host.getChatMessages = (id: number) => [{ message_id: id, role: 'assistant', message }];
host.setChatMessages = async ([edit]: any[]) => {
  assert.equal(edit.message_id, 6, '事务只修改捕获的原楼层');
  if (failText) throw new Error('正文写入失败');
  message = edit.message;
  afterAppend();
};
host.Mvu = {
  getMvuData: () => ({ stat_data: structuredClone(saved), initialized_lorebooks: ['主世界书'] }),
  replaceMvuData: async (next: any, scope: any) => {
    assert.equal(scope.message_id, 6);
    writeCount++;
    if (failData) {
      // 写入期间其他扩展也可能追加内容，回滚必须保留它。
      message += '<其他扩展记录/>';
      throw new Error('变量写入失败');
    }
    if (!discardData) saved = structuredClone(next.stat_data);
  },
};
host.eventEmit = async () => {
  notifications++;
  if (failNotification) throw new Error('通知失败');
};

/** 从上一楼重放正文中的标准 JSONPatch，校验实际协议而不是调用生产差分函数。 */
function replay(start: any, text: string) {
  const result = structuredClone(start);
  for (const match of text.matchAll(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/g)) {
    for (const op of JSON.parse(match[1])) {
      const keys = op.path
        .slice(1)
        .split('/')
        .map((key: string) => key.replace(/~1/g, '/').replace(/~0/g, '~'));
      const key = keys.pop()!;
      const parent = keys.reduce((object: any, part: string) => {
        assert.ok(Object.hasOwn(object, part), `补丁父路径不存在：${op.path}`);
        return object[part];
      }, result);
      if (op.op === 'remove') {
        assert.ok(Object.hasOwn(parent, key), `删除路径不存在：${op.path}`);
        delete parent[key];
      } else {
        assert.ok(op.op === 'add' || op.op === 'replace');
        if (op.op === 'replace') assert.ok(Object.hasOwn(parent, key), `替换路径不存在：${op.path}`);
        parent[key] = structuredClone(op.value);
      }
    }
  }
  return result;
}

async function main() {
  reset();
  const next = structuredClone(saved);
  applyItemRefresh(next, source);
  await MvuUtil.updateMvuDataByObjWithPatch(next);
  assert.ok(saved.商店.温感束缚织带, '用户最后一段标签的商品实际保存');
  assert.equal(saved.角色.user.恶堕积分, 256, '第二次刷新收取 2 积分');
  assert.equal(saved.系统.商店主动刷新次数, 1, '固定收费不再更新旧计次字段');
  assert.ok(message.startsWith(source), '完整原正文和已有标签逐字保留');
  assert.equal(notifications, 1);
  // 原正文的剧情补丁依赖真实角色；这里只重放本次脚本追加的差分。
  const refreshJournal = message.slice(source.length);
  assert.deepEqual(replay(baseline, refreshJournal), saved, '原楼层货架为空时，正文重算恢复货架和积分');
  const beforePurchase = structuredClone(saved);
  const purchased = structuredClone(saved);
  buyItem(purchased, '温感束缚织带', purchased.商店.温感束缚织带.数量);
  await MvuUtil.updateMvuDataByObjWithPatch(purchased, { messageSuffix: '<systemLog>购买道具</systemLog>' });
  assert.equal(saved.商店.温感束缚织带, undefined);
  assert.deepEqual(
    replay(baseline, message.slice(source.length)),
    saved,
    '多次操作按顺序重放，不复活已买完的商品或重复扣费',
  );
  assert.notDeepEqual(saved, beforePurchase);
  await MvuUtil.updateMvuDataByObjWithPatch(saved);
  assert.equal(writeCount, 2, '无差分不重复写变量或追加正文');

  const escapedBefore = { '键/~': { 数组: [1], 删除: '旧值', 状态: '旧' } };
  const escapedAfter = { '键/~': { 数组: [2, 3], 状态: null, 新增: '</JSONPatch><svg />' } };
  const escapedPatch = statDataPatch(escapedBefore, escapedAfter);
  assert.equal((escapedPatch.match(/<\/JSONPatch>/g) ?? []).length, 1, '字段文本不能闭合补丁标签');
  assert.deepEqual(replay(escapedBefore, escapedPatch), escapedAfter, '转义键、数组替换、删除与 null 往返无损');

  reset();
  failText = true;
  await assert.rejects(MvuUtil.updateMvuDataByObjWithPatch(next), /正文写入失败/);
  assert.equal(writeCount, 0);
  assert.equal(message, source);
  reset();
  failData = true;
  await assert.rejects(
    MvuUtil.updateMvuDataByObjWithPatch(next, { messageSuffix: '<systemLog>操作</systemLog>' }),
    /变量写入失败/,
  );
  assert.equal(message, source + '<其他扩展记录/>', '变量失败时撤回本次日志和补丁，保留其他扩展追加');
  assert.deepEqual(saved, baseline);
  assert.equal(notifications, 0);
  reset();
  discardData = true;
  await assert.rejects(MvuUtil.updateMvuDataByObjWithPatch(next), /读回结果不一致/);
  assert.equal(message, source, '宿主静默丢弃写入时不能保留成功补丁');
  assert.equal(notifications, 0);

  reset();
  let active = true;
  afterAppend = () => {
    active = false;
  };
  await assert.rejects(MvuUtil.updateMvuDataByObjWithPatch(next, { isCurrent: () => active }), /已取消/);
  assert.equal(message, source, '追加期间取消时撤回差分');
  assert.equal(writeCount, 0);
  reset();
  afterAppend = () => {
    messageId = 7;
  };
  await assert.rejects(MvuUtil.updateMvuDataByObjWithPatch(next), /楼层已切换/);
  assert.equal(message, source, '新楼层到达后只撤回原楼的追加');
  assert.equal(writeCount, 0);
  reset();
  afterAppend = () => {
    chatId = 'new-chat';
  };
  await assert.rejects(MvuUtil.updateMvuDataByObjWithPatch(next), /无法安全撤回旧聊天/);
  assert.equal(writeCount, 0, '切换聊天后不得写新聊天的变量');

  reset();
  failNotification = true;
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await MvuUtil.updateMvuDataByObjWithPatch(next);
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(saved, next, '通知失败不能把已保存的操作视作失败');
  assert.deepEqual(replay(baseline, message.slice(source.length)), next);
  console.info('MVU 正文差分事务验证通过：货架重算、交易重放、回滚、读回核对、取消与聊天/楼层切换。');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
