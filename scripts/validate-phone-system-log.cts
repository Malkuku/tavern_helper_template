import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useMagicGirlStatStore } from '../src/手机界面/store/StatStore';

const host = globalThis as any;
let data: any;
let message = '原正文';
let failMessage = false;
let failMvu = false;
let notificationCount = 0;

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
host.eventEmit = async () => {
  notificationCount++;
};
host.getVariables = () => null;
host.SillyTavern = { getCurrentChatId: () => 'test-chat' };

function reset() {
  message = '原正文';
  failMessage = false;
  failMvu = false;
  notificationCount = 0;
  data = {
    世界: { 时间: '2026-09-28T12:00[1]' },
    角色: { user: { 恶堕积分: 100, 当前评级: 'D', 评级贡献: 0, 物品: {}, 技能: {} } },
    仓库: {},
    任务: {},
    任务候选: {},
    任务统计: {
      开始周: '2026-9-28',
      周记录: {
        '2026-9-28': {
          周起始: '2026-9-28',
          完成: 0,
          放弃: 0,
          完成评级: { D: 0, C: 0, B: 0, A: 0, S: 0 },
          放弃评级: { D: 0, C: 0, B: 0, A: 0, S: 0 },
        },
      },
    },
    商店: {},
    技能商店: {},
  };
}

const item = { 描述: '道具', 作用: '测试', 评级: 'D', 价格: 6, 数量: 3, 耐久: 100 };
const skill = { 描述: '技能', 作用: '测试', 评级: 'D', 价格: 8 };
const task = { 描述: '任务', 目标: '测试', 当前进度: '未接取', 评级: 'D', 奖励: 5, 已完成: false };

setActivePinia(createPinia());
const store = useMagicGirlStatStore();

async function main() {
  reset();
  data.任务候选['调查<目标>'] = task;
  await store.acceptTask('调查<目标>');
  assert.match(message, /<systemLog>\n<user>接取组织任务「调查&lt;目标&gt;」。/);
  assert.equal(data.任务['调查<目标>'].当前进度, '进行中');
  assert.equal(notificationCount, 1);
  await assert.rejects(store.acceptTask('调查<目标>'), /候选列表/);
  assert.equal((message.match(/<systemLog>/g) ?? []).length, 1);
  await store.abandonTask('调查<目标>');
  assert.match(message, /放弃组织任务「调查&lt;目标&gt;」/);

  reset();
  data.任务.领奖 = { ...task, 已完成: true };
  assert.equal(await store.claimTask('领奖'), 5);
  assert.match(message, /领取组织任务「领奖」的奖励，获得5点恶堕积分/);
  assert.equal(data.角色.user.恶堕积分, 105);
  assert.equal(data.角色.user.评级贡献, 1);

  reset();
  data.商店.药剂 = { ...item };
  await store.purchaseItem('药剂', 2);
  assert.match(message, /购买「药剂」×2，消耗12点恶堕积分/);
  assert.equal(data.角色.user.物品.药剂.数量, 2);
  assert.equal(await store.sellOwnedItem('随身物品', '药剂', 1), 3);
  assert.match(message, /从随身物品出售「药剂」×1，获得3点恶堕积分/);

  reset();
  data.技能商店.火球 = { ...skill };
  await store.purchaseSkill('火球');
  assert.match(message, /购买技能「火球」，消耗8点恶堕积分/);
  data.技能商店.火球 = { ...skill, 价格: 10, 评级: 'C' };
  await store.purchaseSkill('火球');
  assert.match(message, /升级技能「火球」，消耗10点恶堕积分/);
  assert.equal(await store.sellOwnedSkill('火球'), 9);
  assert.match(message, /出售技能「火球」，获得9点恶堕积分/);

  reset();
  await store.unlockSkillSlot();
  assert.equal(data.角色.user.技能栏位, 7);
  assert.equal(data.角色.user.恶堕积分, 50);
  assert.match(message, /解锁第7个技能栏位，消耗50点恶堕积分/);
  await assert.rejects(store.unlockSkillSlot(), /积分不足/);
  assert.equal((message.match(/<systemLog>/g) ?? []).length, 1, '解锁失败不记录剧情操作');

  reset();
  data.角色.user.物品.药剂 = { ...item };
  await store.transferInventory([
    { from: '随身物品', name: '药剂', quantity: 2 },
    { from: '仓库', name: '药剂', quantity: 1 },
  ]);
  assert.equal((message.match(/<systemLog>/g) ?? []).length, 1);
  assert.match(message, /存入仓库药剂×2；从仓库取出药剂×1/);
  assert.equal(data.角色.user.物品.药剂.数量, 2);

  reset();
  data.系统 = { 已发现目标: ['鹭见凛'] };
  data.角色.主要角色 = { 鹭见凛: {}, 林沐沐: {} };
  await store.chooseAdditionalTarget('主要角色', '林沐沐');
  assert.deepEqual(data.系统.已发现目标, ['鹭见凛', '林沐沐']);
  assert.equal(data.角色.user.恶堕积分, 80);
  assert.equal((message.match(/<systemLog>/g) ?? []).length, 1);
  assert.match(
    message,
    /将林沐沐列为目标，消耗20点恶堕积分。\n林沐沐也察觉到了。这意味着哥哥将会得知她最大的秘密。被发现了被发现了/,
  );
  await assert.rejects(store.chooseAdditionalTarget('主要角色', '林沐沐'), /已经是目标/);
  assert.equal((message.match(/<systemLog>/g) ?? []).length, 1);

  reset();
  data.系统 = { 已发现目标: ['鹭见凛'] };
  data.角色.次要角色 = { 路人: {} };
  await store.chooseAdditionalTarget('次要角色', '路人');
  assert.doesNotMatch(message, /林沐沐也察觉到了|被发现了/);

  reset();
  data.系统 = { 已发现目标: ['鹭见凛'] };
  data.角色.主要角色 = { 林沐沐: {} };
  failMvu = true;
  await assert.rejects(store.chooseAdditionalTarget('主要角色', '林沐沐'), /变量写入失败/);
  assert.deepEqual(data.系统.已发现目标, ['鹭见凛']);
  assert.equal(data.角色.user.恶堕积分, 100);
  assert.equal(message, '原正文');

  reset();
  data.商店.药剂 = { ...item };
  failMessage = true;
  await assert.rejects(store.purchaseItem('药剂', 1), /正文写入失败/);
  assert.equal(data.角色.user.恶堕积分, 100);
  assert.equal(message, '原正文');

  reset();
  data.商店.药剂 = { ...item };
  failMvu = true;
  await assert.rejects(store.purchaseItem('药剂', 1), /变量写入失败/);
  assert.equal(data.角色.user.恶堕积分, 100);
  assert.equal(message, '原正文');

  console.log('phone system log validation passed');
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
