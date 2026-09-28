// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import { isNewGenerationResult, removeGeneratedTag } from '../src/手机界面/apps/generationResult';

for (const marker of ['<questVariable', '<shopVariable', '<skillVariable'] as const) {
  const tag = marker.slice(1);
  const oldResult = `<${tag}>{"旧":1}</${tag}>`;
  const newResult = `<${tag}>{"新":2}</${tag}>`;
  const message = (message_id: number, text: string, role = 'assistant') =>
    ({
      message_id,
      role,
      message: text,
    }) as ChatMessage;

  assert.equal(
    isNewGenerationResult(message(8, `正文${newResult}`), marker, 8, '原正文'),
    true,
    `${tag} 同楼生成应被接收`,
  );
  assert.equal(isNewGenerationResult(message(9, newResult), marker, 8, '原正文'), true, `${tag} 新楼生成应被接收`);
  assert.equal(
    isNewGenerationResult(message(8, `改过的正文${oldResult}`), marker, 8, `原正文${oldResult}`),
    false,
    `${tag} 旧结果不能因无关正文变化而重复结算`,
  );
  assert.equal(
    isNewGenerationResult(message(8, `正文${newResult}`), marker, 8, `正文${oldResult}`),
    true,
    `${tag} 同楼替换结果应被接收`,
  );
  assert.equal(
    isNewGenerationResult(message(8, `正文${oldResult}${newResult}`), marker, 8, `正文${oldResult}`),
    true,
    `${tag} 同楼新增结果应交给解析器校验`,
  );
  assert.equal(isNewGenerationResult(message(7, newResult), marker, 8, '原正文'), false, `${tag} 旧楼结果不能结算`);
  assert.equal(
    isNewGenerationResult(message(8, newResult, 'user'), marker, 8, '原正文'),
    false,
    `${tag} 非 assistant 结果不能结算`,
  );
}

const taskTag = '<questVariable>{"任务":1}</questVariable>';
const skillTag = '<skillVariable>{"技能":1}</skillVariable>';
assert.equal(removeGeneratedTag(`正文${taskTag}\n${skillTag}`, taskTag), `正文\n${skillTag}`);
assert.throws(() => removeGeneratedTag('正文', taskTag), /已被修改/);

console.info('手机同楼生成结果接收验证通过。');
