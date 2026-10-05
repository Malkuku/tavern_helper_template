/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import * as Vue from 'vue';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';
import { ratingVisualClass } from '../src/手机界面/apps/witch/ratingVisual';
import * as itemShop from '../src/手机界面/apps/itemShop/itemShop';
import * as shopRefresh from '../src/手机界面/apps/shopRefresh';

function load(filename: string, imports: Record<string, unknown>) {
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: 'item-ui-test' });
  const template = compileTemplate({
    source: descriptor.template!.content,
    filename,
    id: 'item-ui-test',
    compilerOptions: { bindingMetadata: script.bindings },
  });
  assert.deepEqual(template.errors, []);
  const moduleObject = { exports: {} as any };
  runInNewContext(
    transpileModule(`${script.content}\n${template.code}`, {
      compilerOptions: { target: ScriptTarget.ES2020, module: ModuleKind.CommonJS },
    }).outputText,
    {
      exports: moduleObject.exports,
      module: moduleObject,
      Error,
      require(id: string) {
        if (id === 'vue') return Vue;
        if (id in imports) return imports[id];
        throw new Error(`Unexpected import: ${id}`);
      },
    },
  );
  return moduleObject.exports;
}
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.children)];
}
function visibleText(tree: any): string {
  if (Array.isArray(tree)) return tree.map(visibleText).join('');
  if (typeof tree === 'string') return tree;
  return tree && typeof tree === 'object' ? visibleText(tree.children) : '';
}
const item = { 描述: '测试道具', 作用: '防护', 评级: 'D', 价格: 987, 数量: 3, 耐久: 10 };
const card = load('src/手机界面/apps/data/OwnedAssetCard.vue', {
  '../witch/ratingVisual': { ratingVisualClass },
  './InventoryIcon.vue': { default: { name: 'InventoryIcon' } },
});
for (const rating of ['N', 'D', 'C', 'B', 'A', 'S']) {
  const props = { name: '道具', kind: '道具', entry: { ...item, 评级: rating }, expanded: true };
  const state = card.default.setup(props, { expose() {} });
  const tree = card.render({ $slots: {} }, [], props, Vue.proxyRefs(state));
  assert.ok(tree.props.class.includes(`witch-grade-${rating.toLowerCase()}`), '每档道具应用评级配色');
  assert.match(visibleText(tree), new RegExp(`${rating} · × 3`));
  assert.ok(!visibleText(tree).includes('987'), '展开详情不显示道具价格');
}
const data = Vue.reactive({
  世界: { 时间: '2026-9-28T00:00[1]' },
  系统: { 商店下次刷新时间: '', 商店主动刷新次数: 0 },
  角色: { user: { 恶堕积分: 2000, 评级贡献: 0, 物品: { 随身道具: { ...item } } } },
  仓库: { 仓库道具: { ...item } },
  商店: { 商品: { ...item } },
});
const calls: unknown[][] = [];
let failDiscard = false;
const shop = load('src/手机界面/apps/itemShop/ItemShop.vue', {
  '../../store/StatStore': {
    useMagicGirlStatStore: () => ({
      statData: data,
      async discardOwnedItem(...args: unknown[]) {
        if (failDiscard) throw new Error('库存已变化');
        calls.push(args);
      },
    }),
  },
  './itemShop': itemShop,
  '../shopRefresh': shopRefresh,
  '../data/OwnedAssetCard.vue': { default: { name: 'OwnedAssetCard' } },
  '../witch/RefreshFeedback.vue': { default: { name: 'RefreshFeedback' } },
});
const state = shop.default.setup({}, { expose() {} });
function actionTree() {
  const tree = shop.render({}, [], {}, Vue.proxyRefs(state));
  const asset = nodes(tree).find(node => node.type?.name === 'OwnedAssetCard');
  return asset.children.actions();
}
function button(label: string) {
  return nodes(actionTree()).find(node => node.type === 'button' && visibleText(node).trim() === label);
}
async function main() {
  assert.match(visibleText(actionTree()), /单价 987 积分/);
  assert.equal(button('购买 · 987 积分').props.disabled, false);
  state.setQuantity('shop:随身物品:商品', { target: { value: '2' } });
  assert.equal(button('购买 · 1974 积分').props.disabled, false, '总价随数量变化');
  state.setQuantity('shop:随身物品:商品', { target: { value: '3' } });
  assert.equal(button('购买 · 2961 积分').props.disabled, true, '余额不足时禁用购买');
  data.商店.商品.价格 = 0;
  assert.equal(button('购买 · 0 积分').props.disabled, false, '免费商品仍显示零积分总价');
  data.商店.商品.价格 = 987;
  state.tab.value = 'discard';
  state.discardSide.value = '仓库';
  await Vue.nextTick();
  assert.ok(!visibleText(actionTree()).includes('987'), '仓库丢弃列表不显示价格');
  state.quantities.value['discard:仓库:仓库道具'] = 2;
  button('丢弃').props.onClick();
  assert.equal(calls.length, 0, '首次点击只打开确认');
  assert.match(visibleText(actionTree()), /从仓库丢弃 2 件，不返还积分/);
  button('确认丢弃').props.onClick();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(JSON.stringify(calls), JSON.stringify([['仓库', '仓库道具', 2]]));
  assert.equal(state.confirmDiscard.value, null);
  button('丢弃').props.onClick();
  failDiscard = true;
  button('确认丢弃').props.onClick();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.error.value, '库存已变化');
  assert.equal(state.confirmDiscard.value, '仓库:仓库道具', '失败保留确认以便重试');
  state.setQuantity('discard:仓库:仓库道具', { target: { value: '0' } });
  assert.equal(button('丢弃').props.disabled, true);
  assert.equal(state.confirmDiscard.value, null);
  state.discardSide.value = '随身物品';
  await Vue.nextTick();
  assert.equal(state.entries.value[0][0], '随身道具');
  assert.ok(!visibleText(actionTree()).includes('987'), '随身丢弃列表不显示价格');
  console.info('道具界面验证通过：六档配色、购买单价和总价、持有价格隐藏、来源切换、数量、确认和失败提示。');
}
void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
