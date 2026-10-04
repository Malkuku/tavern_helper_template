import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { parse, compileTemplate } from 'vue/compiler-sfc';
import * as Vue from 'vue';
import {
  applyPhoneRoleToStatData,
  validateRoleAsset,
  validateRoleStages,
} from '../src/手机界面/apps/roleEditor/roleAssets';
import { klona } from 'klona';

function component(name: string, props: any, names: string[], model?: any, overrides = {}) {
  const descriptor = parse(readFileSync(`src/手机界面/apps/roleEditor/${name}.vue`, 'utf8')).descriptor;
  const reactiveProps = Vue.reactive(props);
  const script = descriptor.scriptSetup!.content.replace(/^import\s[\s\S]*?;\s*$/gm, '');
  const events: any[] = [];
  const context: any = {
    ...Vue,
    defineProps: () => reactiveProps,
    defineModel: () => Vue.ref(model),
    defineEmits: () => (event: string, value: any) => {
      events.push([event, value]);
      if (event === 'update:modelValue') reactiveProps.modelValue = value;
      if (event === 'update:limits') reactiveProps.limits = value;
    },
    defineExpose: () => {},
    ...overrides,
  };
  const js = (source: string) =>
    transpileModule(source, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS } })
      .outputText;
  runInNewContext(js(`${script}\nglobalThis.api = { ${names.join(',')} };`), context);
  const template = compileTemplate({ source: descriptor.template!.content, filename: `${name}.vue`, id: name });
  assert.deepEqual(template.errors, []);
  const rendering: any = {
    exports: {},
    require: () => ({ ...Vue, resolveComponent: (name: string) => name, withDirectives: (node: any) => node }),
  };
  runInNewContext(js(template.code), rendering);
  const render = () =>
    rendering.exports.render(
      Vue.proxyRefs({ ...Vue.toRefs(reactiveProps), ...context.api, $emit: context.defineEmits() }),
      [],
      {},
      {},
      {},
      {},
    );
  return { props: reactiveProps, api: context.api, events, render };
}
function nodes(vnode: any): any[] {
  if (!vnode || typeof vnode !== 'object') return [];
  return [vnode, ...(Array.isArray(vnode.children) ? vnode.children.flatMap(nodes) : [])];
}
function text(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node?.children)) return node.children.map(text).join('');
  return typeof node?.children === 'string' ? node.children : '';
}
const stage = component(
  'RoleStageEditor',
  {
    kind: '创伤稳定度',
    modelValue: { 当前等级: 1, 累计经验: -5, 描述: { '0': '不稳定', '1': '稳定' } },
    limits: { '0': '低阶段限制', '1': '正常限制' },
  },
  ['levels', 'newLevel', 'error', 'setNumber', 'setDescription', 'addLevel', 'removeLevel'],
);
let tree = nodes(stage.render());
const inputs = tree.filter(node => node.type === 'input');
inputs[1].props.onInput({ target: { value: '-12' } });
assert.equal(stage.props.modelValue.累计经验, -12);
const areas = tree.filter(node => node.type === 'textarea');
areas[2].props.onInput({ target: { value: '新的稳定人设' } });
assert.equal(stage.props.modelValue.描述['1'], '新的稳定人设');
areas[3].props.onInput({ target: { value: '新的能力边界' } });
assert.equal(stage.props.limits['1'], '新的能力边界');
assert.equal(stage.props.modelValue.描述['0'], '不稳定');
stage.api.newLevel.value = '2';
tree.find(node => node.type === 'button' && text(node).includes('添加等级')).props.onClick();
assert.ok(Object.hasOwn(stage.props.modelValue.描述, '2'));
stage.api.newLevel.value = '2';
stage.api.addLevel();
assert.match(stage.api.error.value, /尚未使用/);
stage.api.removeLevel('1');
assert.ok(Object.hasOwn(stage.props.modelValue.描述, '1'));
stage.api.removeLevel('0');
assert.equal(stage.props.modelValue.描述['0'], undefined);
assert.equal(stage.props.limits['0'], undefined);

const list = component('RoleListField', { label: '身份', modelValue: ['第一行\n第二行'] }, ['update', 'remove']);
nodes(list.render())
  .find(node => node.type === 'textarea')
  .props.onInput({ target: { value: '含换行\n和空格 的身份' } });
assert.equal(list.props.modelValue[0], '含换行\n和空格 的身份');
nodes(list.render())
  .find(node => node.type === 'button' && text(node).includes('添加'))
  .props.onClick();
assert.equal(list.props.modelValue.length, 2);

const registry = JSON.parse(
  readFileSync('O:/St Working/角色卡开发/魔法少女恶堕/魔法少女恶堕/系统配置/角色资源.json', 'utf8'),
);
const asset: any = Object.values(registry).find((value: any) => value.type === '主要角色');
const data = structuredClone(asset.data);
const detail = component(
  'RoleDetailFields',
  { type: '主要角色' },
  ['data', 'active', 'tabs', 'stageKinds', 'bodyParts', 'updateStage'],
  data,
);
tree = nodes(detail.render());
tree.find(node => node.type === 'button' && text(node) === '人设阶段').props.onClick();
assert.equal(detail.api.active.value, 'stages');
const editors = tree.filter(node => node.type === 'RoleStageEditor');
assert.equal(editors.length, 3);
editors
  .find(node => node.props.kind === '好感度')
  .props['onUpdate:modelValue']({ 当前等级: 0, 累计经验: -3, 描述: { '0': '独立编辑的人设' } });
assert.equal(detail.api.data.value.人设阶段.好感度.描述['0'], '独立编辑的人设');
tree
  .find(node => node.type === 'RoleListField' && node.props.label === '身份')
  .props['onUpdate:modelValue'](['新的身份']);
assert.equal(detail.api.data.value.基础信息.身份[0], '新的身份');
const fields = tree.filter(node => node.type === 'textarea');
fields[0].props['onUpdate:modelValue']('新的正常形态');
assert.equal(detail.api.data.value.外貌.魔法少女形态.正常, '新的正常形态');
const checked = validateRoleAsset({ ...asset, data: Vue.toRaw(detail.api.data.value) });
const reloaded = validateRoleAsset(JSON.parse(JSON.stringify(checked)));
assert.deepEqual(reloaded.data, checked.data);
assert.notEqual(asset.data.人设阶段.好感度.描述['0'], '独立编辑的人设');
async function verifyConfirmation() {
  const role = structuredClone(asset.data);
  role.人设阶段.恶堕度.当前等级 = 3;
  role.人设阶段.恶堕度.累计经验 = -9;
  role.人设阶段.恶堕度.描述['3'] = '当前剧情人设';
  const id = 'test-asset';
  const parent = component(
    'RoleEditor',
    {},
    [
      'setDraft',
      'draft',
      'runtime',
      'registry',
      'dialog',
      'requestRuntime',
      'cancelDialog',
      'error',
      'replaceStages',
      'rows',
      'search',
      'typeFilter',
    ],
    undefined,
    {
      useMagicGirlStatStore: () => ({}),
      klona,
      roleAvatarStyleNames: [],
      validateRoleAsset,
      validateRoleStages,
      applyPhoneRoleToStatData,
    },
  ).api;
  parent.registry.value = { [id]: asset };
  parent.runtime.value = { user: {}, 主要角色: { [asset.key]: role }, 次要角色: {} };
  parent.setDraft(id, asset);
  await parent.requestRuntime();
  assert.equal(parent.error.value, '');
  assert.match(parent.dialog.value.body, /保持原样/);
  assert.ok(parent.dialog.value.fields.every((value: string) => !value.includes('人设阶段')));
  parent.cancelDialog();
  assert.equal(parent.dialog.value, null);
  assert.equal(parent.runtime.value.主要角色[asset.key].人设阶段.恶堕度.累计经验, -9);
  parent.replaceStages.value = true;
  await parent.requestRuntime();
  assert.match(parent.dialog.value.body, /初始|替换为资源/);
  assert.ok(parent.dialog.value.fields.some((value: string) => value.includes('人设阶段.恶堕度.当前等级')));
  parent.search.value = '不存在的角色';
  assert.equal(parent.rows.value.length, 0);
  parent.search.value = asset.key;
  assert.equal(parent.rows.value.length, 1);
  parent.typeFilter.value = '次要角色';
  assert.equal(parent.rows.value.length, 0);
  console.log('正式 Vue 阶段、能力限制、身份、形态、列表、搜索、替换审阅与取消及数据往返验证通过');
}
verifyConfirmation().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
