import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const path = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕\\人设\\角色列表.ini';
const template = readFileSync(path, 'utf8');
const start = template.indexOf('<%_', template.indexOf('<%_') + 3) + 3;
const end = template.indexOf('_' + '%>', start);
assert.ok(start >= 3 && end > start, '角色列表应包含可执行的 EJS 数据块');

const stage = (description: string) => ({ 当前等级: 0, 累计经验: 0, 描述: { '0': description } });
const role = (present: boolean) => ({
  在场: present,
  名称检索词: [],
  区域检索词: ['$all'],
  身份: [],
  当前评级: '',
  外貌: '',
  性格: '',
  人设阶段: { 好感度: stage('普通好感描述'), 恶堕度: stage('普通恶堕描述') },
});
const values: Record<string, unknown> = {
  'stat_data.地图': {},
  'stat_data.世界.地图索引': '测试地区',
  'stat_data.角色.主要角色': {},
  'stat_data.角色.次要角色': { 在场角色: role(true), 区域角色: role(false) },
  'stat_data.角色.user': {},
};
const context: Record<string, any> = {
  getChatMessages: () => [],
  getvar: (key: string) => values[key],
};
runInNewContext(`${template.slice(start, end)}\nglobalThis.result = output;`, context, { filename: path });
for (const key of ['在场角色', '区域角色']) {
  assert.equal(context.result.次要角色[key].人设阶段.好感度, '普通好感描述');
  assert.equal(context.result.次要角色[key].人设阶段.恶堕度, '普通恶堕描述');
}
console.log('角色列表完整与简略次要角色均输出当前好感度描述。');
