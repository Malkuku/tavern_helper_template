// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import { cropGeometry } from '../src/手机界面/imageCrop';

const square = cropGeometry(400, 200, 200, 200, 1, 0, 0);
assert.deepEqual([square.sourceX, square.sourceY, square.sourceWidth, square.sourceHeight], [100, 0, 200, 200]);

const moved = cropGeometry(400, 200, 200, 200, 1, 80, 0);
assert.deepEqual([moved.sourceX, moved.sourceY], [20, 0]);
assert.equal(cropGeometry(400, 200, 200, 200, 1, 999, 0).sourceX, 0);

const zoomed = cropGeometry(400, 200, 200, 200, 2, 0, 0);
assert.deepEqual([zoomed.sourceWidth, zoomed.sourceHeight], [100, 100]);
assert.deepEqual([zoomed.sourceX, zoomed.sourceY], [150, 50]);

console.info('图片裁剪坐标验证通过。');
