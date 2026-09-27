import assert from 'node:assert/strict';
import { changeRuntimeMinorRole } from '../src/手机界面/apps/roleEditor/roleAssets';

const original = {
  名称检索词: ['$all'], 区域检索词: ['$all'], 在场: true, 身份: ['学生'], 背景: '', 外貌: '', 性格: '', 身体开发状态: [], 能力描述: [],
};
const data = { 角色: { 次要角色: { 测试: structuredClone(original) } }, 手机: { 微信: { 账号: { 测试: { 昵称: '测试' } } } } } as any;
changeRuntimeMinorRole(data, '测试', original, { ...original, 背景: '已修改' });
assert.equal(data.角色.次要角色.测试.背景, '已修改');
assert.throws(() => changeRuntimeMinorRole(data, '测试', original, null), /其他操作修改/);
assert.throws(() => changeRuntimeMinorRole(data, '测试', data.角色.次要角色.测试, { ...original, 非法: true } as any));
changeRuntimeMinorRole(data, '测试', structuredClone(data.角色.次要角色.测试), null);
assert.equal(data.角色.次要角色.测试, undefined);
assert.ok(data.手机.微信.账号.测试);
console.log('当前剧情次要角色编辑与删除验证通过');
