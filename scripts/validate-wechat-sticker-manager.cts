/* eslint-disable import-x/no-nodejs-modules -- Node 本地行为验证脚本。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import * as Vue from 'vue';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';
import * as library from '../src/手机界面/apps/wechat/imageLibrary';
import * as categories from '../src/手机界面/apps/wechat/imageCategories';
import { useStickerImport } from '../src/手机界面/apps/wechat/stickerImport';

let variables: Record<string, any> = {};
(globalThis as any).getScriptId = () => 'sticker-refactor-test';
(globalThis as any).getVariables = () => variables;
(globalThis as any).updateVariablesWith = (updater: (value: Record<string, any>) => Record<string, any>) => {
  variables = updater(variables);
  return variables;
};
let confirmed = true;
(globalThis as any).window = { confirm: () => confirmed };
const picture = 'data:image/png;base64,iVBORw0KGgo=';
for (let index = 0; index < 100; index++) library.addNamedSticker(`表情${index.toString().padStart(3, '0')}`, picture);
const accounts = Vue.reactive({
  user: { 昵称: '我', 头像: '', 好友: [], 表情包: { 旧表情: 'https://example.com/old.png' } as Record<string, string> },
  alice: { 昵称: '爱丽丝', 头像: '', 好友: [], 表情包: {} as Record<string, string> },
});
let writes = 0;
let failSave = false;
let failBackup = false;
const store = {
  async updateWeChatAccount(id: string, _name: string, _avatar: string, stickers: Record<string, string>) {
    writes++;
    if (failSave) throw new Error('楼层写入失败');
    accounts[id as keyof typeof accounts].表情包 = stickers;
    if (failBackup) throw new Error('备份失败');
  },
};
function component(filename: string) {
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: filename });
  const template = compileTemplate({
    source: descriptor.template!.content,
    filename,
    id: filename,
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
      require(id: string) {
        if (id === 'vue') return Vue;
        if (id.endsWith('StatStore')) return { useMagicGirlStatStore: () => store };
        if (id.endsWith('imageCategories')) return categories;
        if (id.endsWith('imageLibrary'))
          return {
            ...library,
            readWechatImageFile: async (file: { name: string }) => {
              if (file.name === '坏图.png') throw new Error('无法读取');
              return picture;
            },
          };
        if (id.endsWith('stickerImport')) return { useStickerImport };
        if (id.endsWith('imageCrop')) return { chooseImageCrop: async (file: unknown) => file };
        if (id.endsWith('.vue')) return { default: { name: id } };
        if (id.endsWith('.css')) return {};
        throw new Error(`Unexpected import: ${id}`);
      },
      window: { confirm: () => confirmed },
      Error,
      Set,
    },
  );
  return moduleObject.exports;
}
function textOf(node: any): string {
  return typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node?.children
        ? textOf(node.children)
        : '';
}
function find(node: any, predicate: (node: any) => boolean): any {
  if (Array.isArray(node)) {
    for (const child of node) {
      const result = find(child, predicate);
      if (result) return result;
    }
  } else if (node && typeof node === 'object') {
    if (predicate(node)) return node;
    return find(node.children, predicate);
  }
}
async function run() {
  const page = component('src/手机界面/apps/wechat/WeChatStickerManager.vue');
  const state = page.default.setup({ accountId: 'user', accounts }, { expose() {}, emit() {} });
  const render = () => page.render({}, [], {}, Vue.proxyRefs(state));
  const button = (label: string) => find(render(), node => node.type === 'button' && textOf(node).includes(label));
  assert.equal(state.organizing.value, false);
  assert.equal(
    find(render(), node => node.props?.class === 'wx-stickers-check'),
    undefined,
    '浏览不显示勾选框',
  );
  assert.equal(button('归档所选'), undefined, '浏览不显示批量动作');
  assert.equal(button('设为常用'), undefined, '浏览不显示卡片动作');
  button('添加表情').props.onClick();
  assert.equal(state.importing.value, true);
  state.importing.value = false;
  state.setSection('library');
  assert.equal(state.visible.value.length, 101, '全部范围包含旧表情');
  state.search.value = '表情099';
  assert.equal(state.visible.value.length, 1);
  state.tapSticker('表情099', 'sticker://表情099');
  assert.equal(state.detail.value.name, '表情099', '普通点击打开详情');
  state.detail.value = null;
  button('整理').props.onClick();
  assert.equal(state.organizing.value, true);
  state.tapSticker('表情099', picture);
  assert.equal(state.checked.value[0], '表情099');
  const before = writes;
  await state.updateSelection([...state.checked.value], true);
  assert.equal(writes, before + 1);
  assert.equal(accounts.user.表情包.表情099, 'sticker://表情099');
  assert.equal(Object.keys(accounts.alice.表情包).length, 0);
  state.checked.value = ['表情099'];
  state.search.value = '表情098';
  assert.equal(state.checked.value.length, 0, '筛选同步清空勾选');
  state.finishOrganizing();
  assert.equal(state.organizing.value, false);
  state.search.value = '';
  state.favorite('表情050');
  assert.equal(state.visible.value[0][0], '表情050');
  state.archiveNames(['表情099'], true);
  assert.equal(state.visible.value.length, 100);
  assert.equal(library.resolveWechatImage('sticker://表情099'), picture, '归档保留历史消息图片');
  state.archived.value = true;
  assert.equal(state.visible.value.length, 1);
  state.archiveNames(['表情099'], false);
  state.archived.value = false;
  accounts.user.表情包.表情001 = 'https://example.com/old.png';
  confirmed = false;
  const writesBeforeCancel = writes;
  await state.updateSelection(['表情001'], true);
  assert.equal(writes, writesBeforeCancel);
  confirmed = true;
  await state.updateSelection(['表情001'], true);
  assert.equal(accounts.user.表情包.表情001, 'sticker://表情001');
  await state.updateSelection(['表情001', '表情099'], false);
  assert.equal(accounts.user.表情包.旧表情, 'https://example.com/old.png');
  assert.equal(library.stickerLibraryEntries().length, 100);

  const events: string[] = [];
  const importer = component('src/手机界面/apps/wechat/WeChatStickerImport.vue');
  const importState = importer.default.setup(
    { accountId: 'user', accounts, chooseFiles: false },
    {
      expose() {},
      emit(name: string) {
        events.push(name);
      },
    },
  );
  await importState.readFiles({
    target: { files: [{ name: '新表情.png' }, { name: '新表情.png' }, { name: '坏图.png' }], value: 'files' },
  });
  assert.equal(importState.drafts.value.length, 2);
  assert.match(importState.error.value, /坏图/);
  const countBefore = library.stickerLibraryEntries().length;
  await importState.submit();
  assert.equal(library.stickerLibraryEntries().length, countBefore, '重名预检不入库');
  assert.equal(events.length, 0, '失败不关闭添加');
  importState.drafts.value[1].name = '另一表情';
  failSave = true;
  await importState.submit();
  assert.equal(importState.drafts.value.length, 2);
  assert.match(importState.error.value, /保存未完成/);
  failSave = false;
  failBackup = true;
  await importState.submit();
  assert.equal(importState.drafts.value.length, 2);
  failBackup = false;
  await importState.submit();
  assert.equal(importState.drafts.value.length, 0);
  assert.deepEqual(events, ['saved', 'close']);
  assert.equal(library.stickerLibraryEntries().length, countBefore + 2, '失败重试不重复入库');
  const single = useStickerImport(
    () => 'user',
    () => accounts,
    store.updateWeChatAccount,
  );
  single.addImage(library.readWechatStickerLibrary().表情050);
  assert.equal(single.drafts.value[0].imported, true, '图库选择直接复用已有名称');
  const reusedName = single.drafts.value[0].name;
  assert.equal(await single.save(), true);
  assert.equal(accounts.user.表情包[reusedName], library.stickerReference(reusedName));
  single.addImage(picture, '坏<名');
  assert.equal(await single.save(), false);
  assert.equal(single.drafts.value.length, 1);
  console.info(
    '表情重构验证通过：简洁浏览/详情、显式整理、百张检索、旧表情、选用移除、常用、归档恢复、共享名称复用、读取失败、重名预检与账号/备份失败重试。',
  );
}
void run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
