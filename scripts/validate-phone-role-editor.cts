import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';
import {
  applyPhoneRoleToStatData,
  changeRuntimeMinorRole,
  loadPhoneRoleAssets,
  parseRoleRegistry,
  savePhoneRoleAsset,
  validateRoleAsset,
} from '../src/手机界面/apps/roleEditor/roleAssets';
import { wechatRoleAvatar } from '../src/尘史使徒/UI/components/common/roleAvatarFallback';
import { parseMinorCorruptionTemplate } from '../src/手机界面/store/minorCorruption';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const load = (name: string) => readFileSync(join(root, '系统配置', `${name}.json`), 'utf8');
const registry = parseRoleRegistry(load('角色资源'));
const opening = JSON.parse(load('唯一开局'));
const entries = [
  ...['唯一开局', '角色资源', '地图资源'].map(name => ({ name: `<配置>${name}`, content: load(name) })),
  { name: '<模板>通用恶堕值', content: load('通用恶堕值') },
];
const minorTemplate = parseMinorCorruptionTemplate(entries);
const assembled = reconcileWorldbookStatData({ 作者: 987 }, entries).data as any;

for (const asset of Object.values(registry)) {
  const role = asset as any;
  assert.ok(role.meta?.color);
  assert.equal(validateRoleAsset(role).key, role.key);
}
const rin = Object.values(registry).find((asset: any) => asset.key === '鹭见凛') as any;
assert.equal(assembled.角色.主要角色.鹭见凛.meta.color, rin.meta.color);
assert.equal(assembled.角色.主要角色.鹭见凛.当前评级, 'A');
assert.ok(assembled.角色.主要角色.鹭见凛.基础信息.身份.includes('野生的魔法少女「白金裁定」'));
assert.equal(assembled.手机.微信.账号.鹭见凛.头像, wechatRoleAvatar(rin.meta, rin.key));
const oldMain = structuredClone(rin);
delete oldMain.data.当前评级;
const replacedMain = applyPhoneRoleToStatData(assembled, oldMain, true);
assert.equal(replacedMain.角色.主要角色.鹭见凛.当前评级, 'A');

const minor = {
  author: 'test',
  key: '测试次要角色',
  desc: '',
  type: '次要角色',
  meta: { avatar: 'https://example.com/avatar.png', color: '#aabbcc', avatarStyle: '2' },
  data: {
    名称检索词: [],
    区域检索词: [],
    在场: true,
    身份: ['测试身份'],
    当前评级: 'C',
    背景: '',
    外貌: '',
    性格: '',
    身体开发状态: [],
    能力描述: [],
  },
} as const;
assert.equal(validateRoleAsset(minor as any).key, minor.key);
assert.throws(() => applyPhoneRoleToStatData(assembled, rin, false), /替换/);
const before = structuredClone(assembled);
const added = applyPhoneRoleToStatData(assembled, minor as any, false, minorTemplate);
assert.deepEqual(added.系统.已发现目标, []);
assert.deepEqual(added.角色.次要角色[minor.key].人设阶段.恶堕度, minorTemplate);
assert.equal(added.角色.次要角色[minor.key].meta.color, '#aabbcc');
assert.equal(added.角色.次要角色[minor.key].当前评级, 'C');
assert.deepEqual(added.角色.次要角色[minor.key].身份, ['测试身份']);
assert.equal(added.手机.微信.账号[minor.key].头像, minor.meta.avatar);
assert.deepEqual(assembled, before);
added.角色.次要角色[minor.key].人设阶段.恶堕度.当前等级 = 3;
const replaced = applyPhoneRoleToStatData(
  added,
  { ...minor, meta: { ...minor.meta, avatar: '' } } as any,
  true,
  minorTemplate,
);
assert.deepEqual(replaced.系统.已发现目标, []);
assert.equal(replaced.角色.次要角色[minor.key].人设阶段.恶堕度.当前等级, 3);
const specialized = applyPhoneRoleToStatData(
  added,
  {
    ...minor,
    data: {
      ...minor.data,
      人设阶段: { 恶堕度: { ...minorTemplate, 描述: { ...minorTemplate.描述, '3': '角色专属阶段' } } },
    },
  } as any,
  true,
  minorTemplate,
);
assert.equal(specialized.角色.次要角色[minor.key].人设阶段.恶堕度.当前等级, 3);
assert.equal(specialized.角色.次要角色[minor.key].人设阶段.恶堕度.描述['3'], '角色专属阶段');
assert.throws(() => applyPhoneRoleToStatData(assembled, minor as any, false), /缺少次要角色通用恶堕值模板/);
assert.equal(
  replaced.手机.微信.账号[minor.key].头像,
  wechatRoleAvatar(replaced.角色.次要角色[minor.key].meta, minor.key),
);
assert.throws(() => validateRoleAsset({ ...minor, data: { ...minor.data, 非法: true } } as any), /角色数据不符合/);
const runtimeEdited = structuredClone(added);
changeRuntimeMinorRole(runtimeEdited, minor.key, added.角色.次要角色[minor.key], {
  ...added.角色.次要角色[minor.key],
  背景: '已修改',
});
assert.equal(runtimeEdited.角色.次要角色[minor.key].背景, '已修改');
assert.throws(
  () => changeRuntimeMinorRole(runtimeEdited, minor.key, added.角色.次要角色[minor.key], null),
  /其他操作修改/,
);
assert.ok(runtimeEdited.角色.次要角色[minor.key]);
changeRuntimeMinorRole(runtimeEdited, minor.key, structuredClone(runtimeEdited.角色.次要角色[minor.key]), null);
assert.equal(runtimeEdited.角色.次要角色[minor.key], undefined);
assert.ok(runtimeEdited.手机.微信.账号[minor.key]);

const uuid = Object.keys(registry)[0];
let current = [
  { name: '<配置>角色资源', content: load('角色资源') },
  { name: '<配置>地图资源', content: load('地图资源') },
  { name: '<模板>通用恶堕值', content: load('通用恶堕值') },
];
(globalThis as any).getCharWorldbookNames = () => ({ primary: 'test' });
(globalThis as any).getWorldbook = async () => structuredClone(current);
(globalThis as any).replaceWorldbook = async (_name: string, next: typeof current) => {
  current = structuredClone(next);
};

(async () => {
  const original = (await loadPhoneRoleAssets())[uuid];
  await savePhoneRoleAsset(uuid, { ...original, desc: '已编辑' }, original);
  assert.equal((await loadPhoneRoleAssets())[uuid].desc, '已编辑');
  const newId = '00000000-0000-4000-8000-000000000002';
  await savePhoneRoleAsset(newId, minor as any);
  assert.deepEqual((await loadPhoneRoleAssets())[newId].data.人设阶段.恶堕度, minorTemplate);
  const saved = structuredClone(current);
  current = current.filter(item => item.name !== '<模板>通用恶堕值');
  await assert.rejects(savePhoneRoleAsset('00000000-0000-4000-8000-000000000003', minor as any), /通用恶堕值/);
  assert.equal(
    current.find(item => item.name === '<配置>角色资源')?.content,
    saved.find(item => item.name === '<配置>角色资源')?.content,
  );
  current = saved;
  await assert.rejects(savePhoneRoleAsset(uuid, { ...original, desc: '冲突' }, original), /其他编辑修改/);
  assert.equal((await loadPhoneRoleAssets())[uuid].desc, '已编辑');
  assert.equal(Object.values(opening.开场白).length, 1);
  console.log('手机角色编辑器资源与运行态验证通过');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
