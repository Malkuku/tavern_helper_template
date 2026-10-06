import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import * as Vue from 'vue';
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc';
import * as model from '../src/在场角色状态/model';
import { stageExperienceProgress } from '../src/手机界面/store/stageProgression';

type Node = { type: string; text: string; children: Node[]; props: Record<string, any>; parent?: Node };
const node = (type: string, text = ''): Node => ({ type, text, children: [], props: {} });
const renderer = Vue.createRenderer<Node, Node>({
  createElement: type => node(type),
  createText: text => node('#text', text),
  createComment: text => node('#comment', text),
  setText: (target, text) => {
    target.text = text;
  },
  setElementText: (target, text) => {
    target.text = text;
    target.children = [];
  },
  parentNode: target => target.parent ?? null,
  nextSibling: target => {
    const siblings = target.parent?.children ?? [];
    return siblings[siblings.indexOf(target) + 1] ?? null;
  },
  patchProp: (target, key, _old, value) => {
    target.props[key] = value;
  },
  insert(target, parent, anchor) {
    if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1);
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, target);
    target.parent = parent;
  },
  remove(target) {
    if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1);
    target.parent = undefined;
  },
});
function all(target: Node): Node[] {
  return [target, ...target.children.flatMap(all)];
}
function content(target: Node): string {
  if (target.type === '#comment') return '';
  return target.text + target.children.map(content).join('');
}

const long = '长篇身体状态记录，完整保留文字与换行。\n'.repeat(60);
const stage = (prefix: string) => ({
  当前等级: 2,
  累计经验: 10,
  描述: { '1': `${prefix}回退阶段`, '2': `${prefix}当前阶段`, '3': `${prefix}相邻阶段` },
});
const body = () => ({
  特殊状态: ['特殊状态正文', { 名称: '结构化状态', 描述: '测试' }],
  ...Object.fromEntries(
    model.bodyParts.map(part => [
      part,
      {
        当前状态: `${part}当前正文：${long}`,
        特征: `${part}特征正文`,
        开发程度: `${part}开发正文`,
      },
    ]),
  ),
});
const fixture = {
  角色: {
    user: {},
    主要角色: {
      同名角色: {
        在场: true,
        当前评级: 'A',
        身体: body(),
        人设阶段: {
          创伤稳定度: stage('稳定度'),
          好感度: stage('好感'),
          恶堕度: stage('恶堕'),
        },
      },
      离场角色: { 在场: false },
      非布尔角色: { 在场: 'true' },
    },
    次要角色: { 同名角色: { 在场: true, 身体: body(), 人设阶段: { 好感度: stage('次要好感') } } },
  },
  手机: { 档案解锁: { 主要角色: { 同名角色: ['好感度', '恶堕度', '身体状态'] }, 次要角色: {} } },
};
let latest: any = structuredClone(fixture);
let failRead = false;
let stopped = 0;
let reads = 0;
const listeners = new Map<string, () => void>();
let initialize = () => Promise.resolve();
const filename = 'src/在场角色状态/App.vue';
const phoneSource = readFileSync('src/手机界面/apps/data/CharacterObservation.vue', 'utf8');
assert.match(phoneSource, /import ObservationStageContent/);
assert.match(phoneSource, /import ObservationBodyCard/);
assert.doesNotMatch(phoneSource, /class="observation-stage-head"|class="body-current"/, '手机旧重复 DOM 应退出');
const childCache = new Map<string, any>();
function loadChild(filename: string) {
  if (childCache.has(filename)) return childCache.get(filename);
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: filename });
  const template = compileTemplate({
    source: descriptor.template!.content,
    filename,
    id: filename,
    compilerOptions: { bindingMetadata: script.bindings },
  });
  assert.deepEqual(template.errors, []);
  const child = { exports: {} as any };
  runInNewContext(
    transpileModule(`${script.content}\n${template.code}`, {
      compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS },
    }).outputText,
    {
      exports: child.exports,
      module: child,
      require(id: string) {
        if (id === 'vue') return Vue;
        const full = resolve(dirname(filename), id);
        return id.endsWith('.vue') ? { default: loadChild(full) } : require(full);
      },
    },
  );
  child.exports.default.render = child.exports.render;
  childCache.set(filename, child.exports.default);
  return child.exports.default;
}
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
const script = compileScript(descriptor, { id: 'present-status-test' });
const template = compileTemplate({
  source: descriptor.template!.content,
  filename,
  id: 'present-status-test',
  compilerOptions: { bindingMetadata: script.bindings },
});
assert.deepEqual(template.errors, []);
const moduleObject = { exports: {} as any };
runInNewContext(
  transpileModule(`${script.content}\n${template.code}`, {
    compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.CommonJS },
  }).outputText,
  {
    exports: moduleObject.exports,
    module: moduleObject,
    require(id: string) {
      if (id === 'vue') return Vue;
      if (id === './model') return model;
      if (id.endsWith('.css')) return {};
      if (id.endsWith('.vue')) return { default: loadChild(resolve(dirname(filename), id)) };
      throw new Error(`Unexpected import: ${id}`);
    },
    console: { error() {} },
    getCurrentMessageId: () => 7,
    waitGlobalInitialized: (name: string) => {
      assert.equal(name, 'Mvu');
      return initialize();
    },
    eventOn: (name: string, callback: () => void) => {
      listeners.set(name, callback);
      return {
        stop() {
          stopped++;
          listeners.delete(name);
        },
      };
    },
    Mvu: {
      events: { VARIABLE_INITIALIZED: 'init', VARIABLE_UPDATE_ENDED: 'update' },
      getMvuData(options: any) {
        assert.equal(options.type, 'message');
        assert.equal(options.message_id, 7, '必须读所在楼层，不能偷读最新楼层');
        reads++;
        if (failRead) throw new Error('模拟宿主读取失败');
        return { stat_data: structuredClone(latest) };
      },
    },
  },
);
const component = moduleObject.exports.default;
component.render = moduleObject.exports.render;
const flush = async () => {
  await Promise.resolve();
  await Vue.nextTick();
  await Vue.nextTick();
};

async function main() {
  const before = JSON.stringify(latest);
  const root = node('root');
  const app = renderer.createApp(component);
  app.mount(root);
  await flush();
  const text = () => content(root);
  const click = async (label: string) => {
    const button = all(root).find(target => target.type === 'button' && content(target) === label);
    assert.ok(button, `按钮不存在：${label}`);
    button.props.onClick();
    await flush();
  };
  const select = async (id: string) => {
    all(root)
      .find(target => target.type === 'select')!
      .props.onChange({ target: { value: id } });
    await flush();
  };
  assert.match(text(), /2 人/);
  assert.match(text(), /稳定度当前阶段/);
  assert.match(text(), /好感当前阶段/);
  assert.doesNotMatch(text(), /当前正文|离场角色|非布尔角色/);
  assert.match(text(), /稳定度相邻阶段/);
  const progressTracks = () => all(root).filter(n => n.props.class === 'observation-stage-progress-track');
  assert.equal(progressTracks().length, 3, '三项状态条必须实际渲染');
  const expected = stageExperienceProgress(latest.角色.主要角色.同名角色.人设阶段.好感度, '好感度');
  assert.equal(progressTracks()[1].children[0].props.style.width, `${expected.percent}%`);
  latest.角色.主要角色.同名角色.人设阶段.好感度.累计经验 = -10;
  listeners.get('update')!();
  await flush();
  assert.match(text(), /回退方向|好感回退阶段/);
  assert.ok(all(root).some(n => String(n.props.class).includes('observation-stage-progress backward')));
  latest = structuredClone(fixture);
  latest.角色.主要角色.同名角色.人设阶段.创伤稳定度.当前等级 = 3;
  listeners.get('update')!();
  await flush();
  assert.equal(progressTracks()[0].children[0].props.style.width, '100%', '最高级状态条填满');
  latest = structuredClone(fixture);
  listeners.get('update')!();
  await flush();
  await click('身体');
  assert.ok(text().includes(`小穴当前正文：${long}`), '长文本与换行必须完整保留');
  for (const part of model.bodyParts) assert.ok(text().includes(`${part}当前正文：${long}`));
  assert.doesNotMatch(text(), /特征正文|开发正文|稳定度当前阶段/);
  const bodyButton = all(root).find(n => n.type === 'button' && content(n).startsWith('胸部'))!;
  bodyButton.props.onClick();
  await flush();
  assert.match(text(), /胸部特征正文|胸部开发正文/);
  bodyButton.props.onClick();
  await flush();
  assert.doesNotMatch(text(), /特征正文|开发正文/);
  const ids = model.presentCharacters(latest).map(character => character.id);
  assert.notEqual(ids[0], ids[1], '同名主次角色身份不能混淆');
  await select(ids[1]);
  assert.doesNotMatch(text(), /创伤稳定度|次要好感当前阶段|当前正文/);
  assert.match(text(), /未解锁/);
  await click('身体');
  assert.match(text(), /身体状态未解锁/);
  assert.doesNotMatch(text(), /特殊状态正文|特征正文|开发正文|当前正文/);
  assert.equal(JSON.stringify(latest), before, '页面浏览与切换不得修改宿主状态');
  latest.手机.档案解锁.次要角色.同名角色 = ['好感度', '身体状态'];
  listeners.get('update')!();
  await flush();
  assert.ok(text().includes(`小穴当前正文：${long}`), '解锁记录刷新后应展示身体');
  await click('阶段');
  assert.match(text(), /次要好感当前阶段|暂无阶段记录/);
  latest.角色.次要角色.同名角色.在场 = false;
  listeners.get('update')!();
  await flush();
  assert.match(text(), /1 人/);
  assert.match(text(), /稳定度当前阶段/);
  assert.doesNotMatch(text(), /次要好感当前阶段/);
  failRead = true;
  listeners.get('update')!();
  await flush();
  assert.match(text(), /读取本楼层角色状态失败/);
  assert.doesNotMatch(text(), /稳定度当前阶段/);
  failRead = false;
  await click('重新读取');
  assert.match(text(), /稳定度当前阶段/);
  latest = { 角色: { 主要角色: {}, 次要角色: {} } };
  listeners.get('init')!();
  await flush();
  assert.match(text(), /当前没有在场角色/);
  latest = undefined;
  listeners.get('update')!();
  await flush();
  assert.match(text(), /本楼层尚无角色数据/);
  latest = { 角色: { 主要角色: { 旧角色: { 在场: true } } } };
  listeners.get('update')!();
  await flush();
  assert.match(text(), /暂无阶段记录/);
  await click('收起');
  assert.doesNotMatch(text(), /暂无阶段记录/);
  await click('展开');
  assert.match(text(), /暂无阶段记录/);
  app.unmount();
  assert.equal(stopped, 3);
  assert.equal(listeners.size, 0);
  let resolve!: () => void;
  initialize = () =>
    new Promise<void>(done => {
      resolve = done;
    });
  const readCount = reads;
  const early = renderer.createApp(component);
  early.mount(node('root'));
  early.unmount();
  resolve();
  await flush();
  assert.equal(reads, readCount, '初始化等待期间卸载，不得迟到读取或注册监听');
  assert.equal(listeners.size, 0);
  console.info(
    '在场角色状态验证通过：共用手机真实组件、三项状态条、回退/最高级、身体卡片展开、解锁隔离、角色切换、缺字段、错误重试与卸载。',
  );
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
