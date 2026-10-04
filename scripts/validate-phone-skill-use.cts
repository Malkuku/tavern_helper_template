import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import * as Vue from 'vue';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';
import * as skillShop from '../src/手机界面/apps/skillShop/skillShop';
import { buildUsePrompt } from '../src/变量卷轴/UI/usePrompt';

const filename = 'src/手机界面/apps/data/Skills.vue';
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
const script = compileScript(descriptor, { id: 'skill-use-test' });
const template = compileTemplate({
  source: descriptor.template!.content,
  filename,
  id: 'skill-use-test',
  compilerOptions: { bindingMetadata: script.bindings },
});
assert.deepEqual(template.errors, []);
const skill = { 描述: '技能描述', 作用: '技能作用', 评级: 'D', 价格: 0 };
const data = { 角色: { user: { 技能: { 测试技能: skill } } } } as any;
let latest = structuredClone(data);
let inputAvailable = true;
let events = 0;
let focusCount = 0;
const input = {
  value: '原有草稿  ',
  dispatchEvent(event: Event) {
    assert.equal(event.type, 'input');
    assert.equal(event.bubbles, true);
    events++;
  },
  focus() {
    focusCount++;
  },
};
const moduleObject = { exports: {} as any };
runInNewContext(
  transpileModule(`${script.content}\n${template.code}`, {
    compilerOptions: { target: ScriptTarget.ES2020, module: ModuleKind.CommonJS },
  }).outputText,
  {
    exports: moduleObject.exports,
    module: moduleObject,
    require(id: string) {
      if (id === 'vue') return Vue;
      if (id.endsWith('OwnedAssetCard.vue')) return { default: { name: 'OwnedAssetCard' } };
      if (id.endsWith('skillShop')) return skillShop;
      if (id.endsWith('StatStore')) return { useMagicGirlStatStore: () => ({}) };
      if (id.endsWith('usePrompt')) return { buildUsePrompt };
      throw new Error(`Unexpected import: ${id}`);
    },
    Error,
    Event,
    getVariables(options: { type: string; message_id: number }) {
      assert.equal(options.type, 'message');
      assert.equal(options.message_id, -1);
      return { stat_data: latest };
    },
    window: { parent: { document: { querySelector: () => (inputAvailable ? input : null) } } },
  },
);
const component = moduleObject.exports.default;
const state = component.setup({ data }, { expose() {} });
state.expandedName.value = '测试技能';
function useButton() {
  const tree = moduleObject.exports.render({}, [], {}, Vue.proxyRefs(state));
  const card = tree.children[1].children[0].children[0];
  return card.children.actions()[0];
}
assert.equal(useButton().type, 'button', '旧技能缺少启用字段时仍提供使用按钮');
state.saving.value = true;
assert.equal(useButton().props.disabled, true);
state.saving.value = false;
const before = JSON.stringify(latest);
useButton().props.onClick();
assert.equal(input.value, `原有草稿  \n${buildUsePrompt(latest, 'skills', '测试技能', 1)}`);
assert.equal(events, 1);
assert.equal(focusCount, 1);
assert.match(state.notice.value, /已填入聊天输入框/);
assert.equal(state.error.value, '');
assert.equal(JSON.stringify(latest), before, '使用草稿不得修改技能');

const originalInput = input.value;
latest.角色.user.技能.测试技能.启用 = false;
useButton().props.onClick();
assert.match(state.error.value, /尚未启用/);
assert.equal(state.notice.value, '');
assert.equal(input.value, originalInput);
delete latest.角色.user.技能.测试技能;
useButton().props.onClick();
assert.match(state.error.value, /不持有/);
assert.equal(input.value, originalInput);
latest = structuredClone(data);
latest.角色.user.技能.测试技能.作用 = '最新作用';
inputAvailable = false;
useButton().props.onClick();
assert.match(state.error.value, /未找到酒馆聊天输入框/);
assert.equal(input.value, originalInput);
inputAvailable = true;
useButton().props.onClick();
assert.match(input.value, /最新作用/);
assert.equal(events, 2, '失败操作不得触发 input');
data.角色.user.技能.测试技能.启用 = false;
assert.notEqual(useButton().type, 'button', '关闭技能不提供使用按钮');
console.info('手机技能使用验收通过：真实按钮、草稿追加、最新状态、旧技能、关闭/删除拒绝、输入框缺失。');
