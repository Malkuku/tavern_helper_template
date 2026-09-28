// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { refreshTasks } from '../src/手机界面/apps/quests/quests';
import { applySkillRefresh, parseSkillResult } from '../src/手机界面/apps/skillShop/skillShop';
import { skillSchema } from '../src/手机界面/store/initialDataSchema';
import { sanitizeMapSvg } from '../src/创意工坊/scenario/map';
import { InvalidGeneratedResultError } from '../src/手机界面/apps/generationResult';

const path = process.argv[2];
if (!path) throw new Error('请传入原始消息文本文件路径。');
const message = readFileSync(path, 'utf8');
const taskData: any = {
  世界: { 时间: '2026-9-28T09:00[1]' },
  系统: { 任务下次刷新时间: '', 任务主动刷新次数: 0 },
  任务: {},
  任务候选: {},
};

refreshTasks(taskData, message);
assert.equal(Object.keys(taskData.任务候选).length, 6);
const skillJson = /<skillVariable>\s*([\s\S]*?)\s*<\/skillVariable>/.exec(message)?.[1];
if (!skillJson) throw new Error('缺少技能标签。');
for (const [name, skill] of Object.entries(JSON.parse(skillJson))) {
  const result = skillSchema.safeParse(skill);
  if (!result.success)
    console.error(
      name,
      result.error.issues.map(issue => ({ path: issue.path, message: issue.message })),
    );
}
const skills = parseSkillResult(message, { 战败收容: { 战力评级贡献: 1 } } as any);
assert.equal(Object.keys(skills).length, 6);
const invalidSkills = { ...skills, 敏感诱发: { ...skills.敏感诱发, 图标: '<svg onload="alert(1)"></svg>' } };
assert.throws(
  () =>
    applySkillRefresh(
      { 角色: { user: { 技能: { 战败收容: { 战力评级贡献: 1 } } } } } as any,
      `<skillVariable>${JSON.stringify(invalidSkills)}</skillVariable>`,
    ),
  InvalidGeneratedResultError,
);
assert.equal(
  sanitizeMapSvg(
    '<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"><path fill-rule="evenodd" stroke-dasharray="4 4" stroke-dashoffset="2" d="M0 0h24v24Z"/></svg>',
  ),
  '<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"><path fill-rule="evenodd" stroke-dasharray="4 4" stroke-dashoffset="2" d="M0 0h24v24Z"/></svg>',
);
assert.throws(() => sanitizeMapSvg('<svg stroke-dasharray="url(https://example.com)"></svg>'));
assert.throws(() => sanitizeMapSvg('<svg><path stroke-dasharray="url(//example.com/a)"/></svg>'));
assert.throws(() => sanitizeMapSvg('<svg><path onload="alert(1)"/></svg>'));
console.info('提供的原始消息中，任务和技能标签均通过完整业务校验。');
