import assert from 'node:assert/strict';
import {
  compressWechatImageLibrary,
  readWechatImageFile,
  readWechatImageLibrary,
  storeWechatImage,
} from '../src/手机界面/apps/wechat/imageLibrary';

let variables: Record<string, unknown> = {};
let encoded = new Blob(['small'], { type: 'image/webp' });
let bitmapCalls = 0;
(globalThis as any).getScriptId = () => 'test-script';
(globalThis as any).getVariables = () => variables;
(globalThis as any).updateVariablesWith = (updater: (value: Record<string, unknown>) => Record<string, unknown>) => {
  variables = updater(variables);
  return variables;
};
(globalThis as any).createImageBitmap = async () => {
  bitmapCalls++;
  return { width: 4096, height: 2048, close() {} };
};
(globalThis as any).document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext() {
      return { drawImage() {} };
    },
    toBlob(callback: (value: Blob) => void) {
      callback(encoded);
    },
  }),
};
(globalThis as any).FileReader = class {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then(
      buffer => {
        this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload?.();
      },
      () => this.onerror?.(),
    );
  }
};

async function run() {
  const png = new File([Buffer.alloc(1000)], 'photo.png', { type: 'image/png' });
  const compressed = await readWechatImageFile(png);
  assert.equal(compressed, 'data:image/webp;base64,c21hbGw=');
  const url = storeWechatImage(
    await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(png);
    }),
  );
  const result = await compressWechatImageLibrary();
  assert.equal(result.count, 1);
  assert.equal(readWechatImageLibrary()[url.slice('script-image://'.length)], compressed, '旧图片压缩后保留引用 ID');

  const gif = new File([Buffer.alloc(100)], 'animated.gif', { type: 'image/gif' });
  const beforeGif = bitmapCalls;
  assert.match(await readWechatImageFile(gif), /^data:image\/gif;base64,/);
  assert.equal(bitmapCalls, beforeGif, 'GIF 不进入静态图片编码');

  encoded = new Blob([Buffer.alloc(2000)], { type: 'image/webp' });
  assert.match(await readWechatImageFile(png), /^data:image\/png;base64,/, '编码变大时保留原文件');
  console.log('Weline 图片上传压缩、GIF 保留、旧图片引用和较大结果回退验证通过');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
