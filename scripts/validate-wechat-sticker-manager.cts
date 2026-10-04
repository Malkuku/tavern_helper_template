import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import * as Vue from 'vue';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';
import * as library from '../src/手机界面/apps/wechat/imageLibrary';
import * as categories from '../src/手机界面/apps/wechat/imageCategories';

let variables: Record<string, any> = {};
(globalThis as any).getScriptId = () => 'sticker-manager-test';
(globalThis as any).getVariables = () => variables;
(globalThis as any).updateVariablesWith = (updater: (value: Record<string, any>) => Record<string, any>) => {
  variables = updater(variables);
  return variables;
};
const picture = 'data:image/png;base64,iVBORw0KGgo=';
for (let index = 0; index < 100; index++) library.addNamedSticker(`表情${index.toString().padStart(3, '0')}`, picture);
const accounts = Vue.reactive({
  user: { 昵称: '我', 头像: '', 好友: [], 表情包: {} as Record<string, string> },
  alice: { 昵称: '爱丽丝', 头像: '', 好友: [], 表情包: {} as Record<string, string> },
});
let writes = 0;
let failSave = false;
let failAfterSave = false;
let confirmed = true;
let crops = 0;
const store = {
  async updateWeChatAccount(id: 'user' | 'alice', _name: string, _avatar: string, stickers: Record<string, string>) {
    writes++;
    if (failSave) throw new Error('楼层写入失败');
    accounts[id].表情包 = stickers;
    if (failAfterSave) throw new Error('备份写入失败');
  },
};
const filename = 'src/手机界面/apps/wechat/WeChatStickerManager.vue';
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
const script = compileScript(descriptor, { id: 'sticker-manager-test' });
const template = compileTemplate({
  source: descriptor.template!.content,
  filename,
  id: 'sticker-manager-test',
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
            if (file.name === '坏图.png') throw new Error('无法读取图片');
            return picture;
          },
        };
      if (id.endsWith('imageCrop'))
        return {
          chooseImageCrop: async (file: unknown) => {
            crops++;
            return file;
          },
        };
      if (id.endsWith('WeChatImageLibrary.vue')) return { default: { name: 'WeChatImageLibrary' } };
      throw new Error(`Unexpected import: ${id}`);
    },
    window: { confirm: () => confirmed },
    Error,
    Set,
  },
);
async function run() {
  const state = moduleObject.exports.default.setup({ accountId: 'user', accounts }, { expose() {}, emit() {} });
  const render = () => moduleObject.exports.render({}, [], {}, Vue.proxyRefs(state));
  function textOf(node: any): string {
    return typeof node === 'string'
      ? node
      : Array.isArray(node)
        ? node.map(textOf).join('')
        : node?.children
          ? textOf(node.children)
          : '';
  }
  function findButton(node: any, label: string): any {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findButton(child, label);
        if (found) return found;
      }
    } else if (node && typeof node === 'object') {
      if (node.type === 'button' && textOf(node).includes(label)) return node;
      return findButton(node.children, label);
    }
  }
  assert.equal(state.section.value, 'selected');
  findButton(render(), '添加表情').props.onClick();
  assert.equal(state.adding.value, true, '顶部真实按钮打开添加流程');
  state.section.value = 'library';
  assert.equal(state.visible.value.length, 100);
  state.search.value = '表情099';
  assert.equal(state.visible.value.length, 1);
  state.toggleAll();
  await state.updateSelection([...state.checked.value], true);
  assert.equal(writes, 1, '批量选用只提交一次');
  assert.equal(accounts.user.表情包.表情099, 'sticker://表情099');
  assert.equal(Object.keys(accounts.alice.表情包).length, 0, '不修改其他账号');
  state.search.value = '';
  state.checked.value = ['表情099'];
  state.search.value = '表情098';
  await Vue.nextTick();
  assert.equal(state.checked.value.length, 0, '改变筛选清除旧勾选');
  const group = categories.createImageGroup('开心').groups[0];
  categories.placeImage(library.imageIdFromUrl(library.readWechatStickerLibrary().表情099), group.id, null);
  state.categories.value = categories.readImageCategories();
  state.search.value = '';
  state.folder.value = group.id;
  assert.equal(state.visible.value.length, 100, '同一图片的所有表情共享图片分类');
  state.folder.value = '';
  state.favorite('表情050');
  assert.equal(state.visible.value[0][0], '表情050', '常用优先排序');
  state.checked.value = ['表情099'];
  state.archiveChecked();
  assert.equal(state.visible.value.length, 99);
  assert.equal(library.resolveWechatImage('sticker://表情099'), picture, '归档不破坏消息图片');
  assert.equal(accounts.user.表情包.表情099, 'sticker://表情099', '归档不改变已选表情');
  state.showArchived.value = true;
  assert.equal(state.visible.value.length, 1);
  state.checked.value = ['表情099'];
  state.archiveChecked();
  state.showArchived.value = false;
  assert.equal(state.visible.value.length, 100);
  accounts.user.表情包.表情001 = 'https://example.com/old.png';
  confirmed = false;
  const before = writes;
  await state.updateSelection(['表情001'], true);
  assert.equal(writes, before, '取消同名替换不写入');
  confirmed = true;
  await state.updateSelection(['表情001'], true);
  assert.equal(accounts.user.表情包.表情001, 'sticker://表情001');
  await state.updateSelection(['表情001', '表情099'], false);
  assert.equal(Object.keys(accounts.user.表情包).length, 0);
  assert.equal(library.stickerLibraryEntries().length, 100, '移除账号表情不删共享库');

  const input = { files: [{ name: '新表情.png' }, { name: '新表情.png' }, { name: '坏图.png' }], value: 'files' };
  await state.readFiles({ target: input });
  assert.equal(crops, 0, '默认批量保留原图');
  assert.equal(state.drafts.value.length, 2);
  assert.match(state.error.value, /坏图/);
  const countBefore = library.stickerLibraryEntries().length;
  await state.importDrafts();
  assert.equal(library.stickerLibraryEntries().length, countBefore, '重复名称先验证，无部分入库');
  state.drafts.value[1].name = '另一表情';
  failSave = true;
  await state.importDrafts();
  assert.equal(state.drafts.value.length, 2);
  assert.equal(
    state.drafts.value.every((draft: any) => draft.imported),
    true,
  );
  assert.match(state.error.value, /账号保存未完成/);
  assert.equal(library.stickerLibraryEntries().length, countBefore + 2);
  failSave = false;
  failAfterSave = true;
  await state.importDrafts();
  assert.equal(state.drafts.value.length, 2, '备份失败仍可重试');
  failAfterSave = false;
  await state.importDrafts();
  assert.equal(state.drafts.value.length, 0);
  assert.equal(library.stickerLibraryEntries().length, countBefore + 2, '重试不重复入库');
  assert.equal(accounts.user.表情包.新表情, 'sticker://新表情');
  assert.equal(accounts.user.表情包.另一表情, 'sticker://另一表情');
  console.info(
    '表情管理验证通过：真实添加入口、百张检索/分类、批量选用/移除、常用、归档恢复、同名替换、冲突预检和写入/备份失败重试。',
  );
}
void run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
