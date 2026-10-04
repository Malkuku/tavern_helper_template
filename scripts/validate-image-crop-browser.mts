/* eslint-disable import-x/no-nodejs-modules -- Node 本地浏览器验收脚本。 */
/* 从后台 iframe 挂载正式裁剪组件至宿主文档，验证移动端尺寸与图片操作。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import webpackCompiler from 'webpack';
import { VueLoaderPlugin } from 'vue-loader';
const require = createRequire(import.meta.url);

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'image-crop-'));
const artifacts = path.join(root, '.codex/previews/image-crop');
const absolute = name => JSON.stringify(path.join(root, name).replaceAll('\\', '/'));
fs.mkdirSync(artifacts, { recursive: true });
fs.writeFileSync(
  path.join(temporary, 'entry.ts'),
  `
import { createApp, h } from 'vue';
import Cropper from ${absolute('src/手机界面/components/ImageCropper.vue')};
import { imageCropRequest, chooseImageCrop } from ${absolute('src/手机界面/imageCrop.ts')};
import ${absolute('src/手机界面/styles/phone.css')};
const host = window.parent as any;
host.cropFixture = {
  async open(width: number, height: number, aspect = 'original', squareAvatar = false) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#edc85a'; ctx.fillRect(0, 0, width, height);
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'));
    this.result = undefined;
    chooseImageCrop(new File([blob], 'test.png', { type: 'image/png' }), aspect as any, squareAvatar)
      .then(file => this.result = file ? { size: file.size, type: file.type } : null);
  },
  iframeWidth: window.innerWidth,
};
createApp({ setup() { return () => h('div', { class: 'phone-module' },
  imageCropRequest.value ? h(Cropper, { request: imageCropRequest.value }) : null); } })
  .mount(host.document.querySelector('#app'));
for (const style of document.head.querySelectorAll('style')) host.document.head.append(style.cloneNode(true));
`,
);
let server;
let browser;
let socket;
let closeBrowser;
async function run() {
  await new Promise((resolve, reject) =>
    webpackCompiler(
      {
        mode: 'development',
        context: root,
        entry: path.join(temporary, 'entry.ts'),
        output: { path: temporary, filename: 'bundle.js' },
        resolve: {
          extensions: ['.ts', '.js', '.vue'],
          modules: ['node_modules', path.join(root, 'node_modules')],
          alias: {
            vue: require.resolve('vue/dist/vue.esm-bundler.js'),
          },
        },
        resolveLoader: { modules: [path.join(root, 'node_modules')] },
        module: {
          rules: [
            { test: /\.vue$/, loader: 'vue-loader' },
            {
              test: /\.ts$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                appendTsSuffixTo: [/\.vue$/],
                configFile: path.join(root, 'tsconfig.json'),
                compilerOptions: { module: 'ESNext' },
              },
            },
            { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
          ],
        },
        plugins: [
          new VueLoaderPlugin(),
          new webpackCompiler.DefinePlugin({
            __VUE_OPTIONS_API__: false,
            __VUE_PROD_DEVTOOLS__: false,
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
          }),
        ],
        devtool: false,
      },
      (error, stats) => {
        if (error || stats.hasErrors()) reject(error || Error(stats.toString({ all: false, errors: true })));
        else resolve();
      },
    ),
  );
  server = http.createServer((request, response) => {
    if (request.url === '/bundle.js') {
      response.setHeader('Content-Type', 'application/javascript');
      response.end(fs.readFileSync(path.join(temporary, 'bundle.js')));
    } else {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(
        request.url === '/frame'
          ? '<!doctype html><script src="/bundle.js"></script>'
          : '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><iframe src="/frame" style="position:absolute;left:-2000px;width:1200px;height:1800px;border:0"></iframe>',
      );
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = path.join(temporary, 'edge');
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = spawn(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  const deadline = Date.now() + 30000;
  while (!fs.existsSync(path.join(profile, 'DevToolsActivePort'))) {
    if (Date.now() > deadline) throw Error('Edge 启动超时');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const [port, endpoint] = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').trim().split('\n');
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  const browserErrors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id);
        if (message.error) request.reject(Error(message.error.message));
        else request.resolve(message.result);
      }
    } else if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.text);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  closeBrowser = () => send('Browser.close');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const command = (method, params) => send(method, params, sessionId);
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 720, deviceScaleFactor: 1, mobile: true });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails)
      throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    const end = Date.now() + 10000;
    while (!(await evaluate(expression))) {
      if (Date.now() > end) throw Error('等待超时：' + expression);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  const click = async text =>
    evaluate(
      `(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('找不到按钮');button.click();})()`,
    );
  const screenshot = async name => {
    const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });

  await waitFor('!!window.cropFixture');
  assert.equal(await evaluate('cropFixture.iframeWidth'), 1200, '后台 iframe 与宿主宽度不同');
  const bounds = async () =>
    evaluate(`(() => {
    const dialog = document.querySelector('.image-crop-dialog');
    const frame = document.querySelector('.image-crop-frame');
    const d = dialog.getBoundingClientRect(), f = frame.getBoundingClientRect();
    return { fits: d.left >= 0 && d.right <= innerWidth && d.top >= 0 && d.bottom <= innerHeight,
      noHorizontalScroll: dialog.scrollWidth <= dialog.clientWidth,
      frameFits: f.left >= d.left && f.right <= d.right,
      frameWidth: frame.clientWidth, frameHeight: frame.clientHeight };
  })()`);
  for (const [width, height] of [
    [390, 720],
    [320, 640],
    [280, 480],
    [720, 320],
  ]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    for (const [iw, ih] of [
      [800, 600],
      [100, 4000],
      [4000, 100],
    ]) {
      await evaluate(`cropFixture.open(${iw}, ${ih})`);
      await waitFor(`document.querySelector('.image-crop-frame img')?.naturalWidth === ${iw}`);
      for (const label of ['原比例', '方形', '横向', '壁纸']) {
        await click(label);
        await new Promise(resolve => setTimeout(resolve, 100));
        const result = await bounds();
        assert.equal(result.fits, true, `${width}x${height} / ${iw}x${ih} / ${label} 弹窗在视口内`);
        assert.equal(result.noHorizontalScroll, true, '弹窗没有横向溢出');
        assert.equal(result.frameFits, true, '裁剪框在弹窗内');
        assert.ok(result.frameHeight <= height * 0.42 + 2, '超长图片不撑高裁剪框');
      }
      await click('取消');
      await waitFor('cropFixture.result === null');
    }
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 640, deviceScaleFactor: 1, mobile: true });
  await evaluate("cropFixture.open(800, 600, 'square', true)");
  await waitFor("document.querySelector('.image-crop-frame img')?.naturalWidth === 800");
  assert.equal(await evaluate("!!document.querySelector('.image-crop-aspects')"), false);
  const before = await bounds();
  await screenshot('square-320');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 720, deviceScaleFactor: 1, mobile: true });
  await waitFor(`document.querySelector('.image-crop-frame').clientWidth > ${before.frameWidth}`);
  const after = await bounds();
  assert.equal(after.fits && after.noHorizontalScroll, true, '宿主尺寸变化后重新适配');
  await evaluate(
    `const slider = document.querySelector('.image-crop-zoom input');slider.value=2;slider.dispatchEvent(new Event('input',{bubbles:true}));`,
  );
  const point = await evaluate(
    `(()=>{const r=document.querySelector('.image-crop-frame').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
  const leftBefore = await evaluate("document.querySelector('.image-crop-frame img').style.left");
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await command('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x + 25,
    y: point.y + 20,
    button: 'left',
    buttons: 1,
  });
  await command('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x + 25,
    y: point.y + 20,
    button: 'left',
    clickCount: 1,
  });
  assert.notEqual(
    await evaluate("document.querySelector('.image-crop-frame img').style.left"),
    leftBefore,
    '拖拽改变图片位置',
  );
  await click('应用裁剪');
  await waitFor('!!cropFixture.result?.size');
  assert.equal(await evaluate('cropFixture.result.type'), 'image/png');
  await evaluate('cropFixture.open(800, 600)');
  await waitFor("document.querySelector('.image-crop-frame img')?.naturalWidth === 800");
  await click('使用原图');
  await waitFor('!!cropFixture.result?.size');
  assert.deepEqual(browserErrors, [], '浏览器无运行时异常');
  console.info(
    '裁剪弹窗验证通过：宿主/iframe 尺寸隔离、390/320/280 窄屏、横屏、超长图片、四种比例、尺寸变化、拖动缩放、应用/原图/取消。',
  );
  console.info('截图：' + artifacts);
}
run()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (closeBrowser && socket?.readyState === WebSocket.OPEN) await closeBrowser().catch(() => {});
    socket?.close();
    browser?.kill();
    server?.close();
    const resolved = path.resolve(temporary);
    await new Promise(resolve => setTimeout(resolve, 800));
    if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
      try {
        fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      } catch {
        console.warn('浏览器临时目录仍被占用：' + resolved);
      }
    }
  });
