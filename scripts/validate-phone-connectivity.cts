import assert from 'node:assert/strict';
import {
  checkImage,
  checkPromptTemplate,
  checkTavern,
  normalizeImageUrl,
} from '../src/手机界面/apps/connectivity/checks';

(globalThis as any).SillyTavern = {
  getCurrentChatId: () => 'test-chat',
  getRequestHeaders: () => ({ 'X-CSRF-TOKEN': 'test' }),
};
assert.equal(checkTavern().state, 'ok');
(globalThis as any).SillyTavern.getRequestHeaders = () => {
  throw new Error('headers unavailable');
};
assert.equal(checkTavern().state, 'error');
assert.throws(() => normalizeImageUrl('javascript:alert(1)'), /http/);
assert.equal(normalizeImageUrl('https://example.com/a.png'), 'https://example.com/a.png');

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 128;
  naturalHeight = 64;
  set src(value: string) {
    queueMicrotask(() => {
      if (value.includes('missing')) this.onerror?.();
      else this.onload?.();
    });
  }
}
(globalThis as any).Image = MockImage;

(async () => {
  const missingPlugin = await checkPromptTemplate({} as Window);
  assert.equal(missingPlugin.state, 'error');
  const workingPlugin = await checkPromptTemplate({ EjsTemplate: { evalTemplate: async () => '42' } } as any);
  assert.equal(workingPlugin.state, 'ok');
  const brokenPlugin = await checkPromptTemplate({ EjsTemplate: { evalTemplate: async () => 'wrong' } } as any);
  assert.equal(brokenPlugin.state, 'error');
  assert.equal((await checkImage('invalid')).state, 'error');
  assert.equal((await checkImage('https://example.com/image.png')).state, 'ok');
  assert.equal((await checkImage('https://example.com/missing.png')).state, 'error');
  console.log('手机连接诊断成功与失败路径验证通过');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
