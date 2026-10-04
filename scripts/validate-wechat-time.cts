// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import { displayWeChatTime, weChatTimeDividers } from '../src/手机界面/apps/wechat/wechatTime';

const now = '2026-10-4T12:00[7]';
assert.equal(displayWeChatTime('2026-10-04T09:03[7]', now), '09:03');
assert.equal(displayWeChatTime('2026-10-3T23:58[6]', now), '昨天 23:58');
assert.equal(displayWeChatTime('2026-10-2T09:03[5]', now), '10月2日 09:03');
assert.equal(displayWeChatTime('2025-10-4T09:03[6]', now), '2025年10月4日 09:03');
assert.equal(displayWeChatTime('2026-10-5T09:03[1]', now), '10月5日 09:03');
assert.equal(displayWeChatTime('2026-10-4T09:03[7]', ''), '2026年10月4日 09:03');
assert.equal(displayWeChatTime('', now), '');
assert.equal(displayWeChatTime('2026-02-30T09:03[1]', now), '2026-02-30T09:03[1]');
assert.equal(displayWeChatTime('2025-12-31T23:58[3]', '2026-1-1T00:01[4]'), '昨天 23:58');
assert.equal(displayWeChatTime('2024-2-29T23:58[4]', '2024-3-1T00:01[5]'), '昨天 23:58');

const dividers = (...times: string[]) => weChatTimeDividers(times.map(时间 => ({ 时间 })));
assert.deepEqual(dividers(), []);
assert.deepEqual(dividers(...['10:00', '10:03', '10:06', '10:09', '10:12'].map(clock => `2026-10-4T${clock}[7]`)), [
  true,
  false,
  true,
  false,
  true,
]);
assert.deepEqual(dividers('2026-10-4T10:00[7]', '2026-10-4T10:04[7]', '2026-10-4T10:05[7]'), [true, false, true]);
assert.deepEqual(dividers('2026-10-3T23:58[6]', '2026-10-4T00:10[7]'), [true, true]);
assert.deepEqual(dividers('2026-10-3T23:59[6]', '2026-10-4T00:01[7]'), [true, true]);
assert.deepEqual(dividers('2025-12-31T23:59[3]', '2026-1-1T00:01[4]'), [true, true]);
assert.deepEqual(dividers('2026-10-4T10:00[7]', '2026-10-4T10:00[7]'), [true, false]);
assert.deepEqual(dividers('2026-10-4T10:00[7]', '2026-10-4T09:59[7]'), [true, true]);
assert.deepEqual(dividers('invalid', '2026-10-4T10:00[7]', 'invalid'), [true, true, true]);
console.log('Weline 时间显示回归通过');
