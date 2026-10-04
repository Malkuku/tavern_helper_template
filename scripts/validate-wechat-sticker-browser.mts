/* eslint-disable import-x/no-nodejs-modules -- Node 本地浏览器验收脚本。 */
/* 本地真实 Vue 组件预览；宿主读写由内存 fixture 代替，不连接真实聊天。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import { VueLoaderPlugin } from 'vue-loader';
const require = createRequire(import.meta.url);

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'weline-stickers-'));
const artifacts = path.join(root, '.codex/previews/sticker-refactor');
const absolute = name => JSON.stringify(path.join(root, name).replaceAll('\\', '/'));
fs.mkdirSync(artifacts, { recursive: true });
fs.writeFileSync(
  path.join(temporary, 'store.ts'),
  `export function useMagicGirlStatStore() { return (window as any).stickerFixture.store; }`,
);
fs.writeFileSync(
  path.join(temporary, 'entry.ts'),
  `
import { createApp, h, reactive, ref } from 'vue';
import Manager from ${absolute('src/手机界面/apps/wechat/WeChatStickerManager.vue')};
import Importer from ${absolute('src/手机界面/apps/wechat/WeChatStickerImport.vue')};
import Picker from ${absolute('src/手机界面/apps/wechat/WeChatStickerPicker.vue')};
import Cropper from ${absolute('src/手机界面/components/ImageCropper.vue')};
import { imageCropRequest } from ${absolute('src/手机界面/imageCrop.ts')};
import ${absolute('src/手机界面/styles/wechat.css')};
let variables: any = { magicGirlWeChatImageLibrary: {}, magicGirlWeChatStickerLibrary: {} };
(window as any).getScriptId = () => 'browser-fixture';
(window as any).getVariables = () => variables;
(window as any).updateVariablesWith = (fn: any) => variables = fn(variables);
const accounts = reactive({ user: { 昵称:'我',头像:'',好友:[],表情包:{} as Record<string,string> }, alice: { 昵称:'爱丽丝',头像:'',好友:[],表情包:{} as Record<string,string> } });
for(let index=0;index<100;index++) {
  const canvas = document.createElement('canvas'); canvas.width=160;canvas.height=160;
  const context = canvas.getContext('2d')!; context.fillStyle=['#f6d56c','#a9dfc7','#d1bbec','#a5d8f2'][index%4];context.beginPath();context.arc(80,75,60,0,Math.PI*2);context.fill();
  context.fillStyle='#34455b';context.beginPath();context.arc(58,65,5,0,Math.PI*2);context.arc(102,65,5,0,Math.PI*2);context.fill();context.lineWidth=4;context.strokeStyle='#34455b';context.beginPath();context.arc(80,78,25,0,Math.PI);context.stroke();
  context.font='18px sans-serif';context.textAlign='center';context.fillText(['开心','收到','晚安','好耶'][index%4]+index,80,151);
  const name='表情'+index.toString().padStart(3,'0');variables.magicGirlWeChatImageLibrary['img'+index]=canvas.toDataURL();variables.magicGirlWeChatStickerLibrary[name]='script-image://img'+index;
  if(index<20) accounts.user.表情包[name]='sticker://'+name;
}
let writes=0;
const fixture: any = { accounts, failSave: false, get writes(){return writes;}, store: { async updateWeChatAccount(id:string,_name:string,_avatar:string,stickers:Record<string,string>){writes++;if(fixture.failSave)throw Error('模拟保存失败');accounts[id as keyof typeof accounts].表情包=stickers;} } };
(window as any).stickerFixture=fixture;
createApp({setup(){const managing=ref(true);const importing=ref(false);const picker=ref();return()=>h('div',{class:'wechat wx-dark'},[
  managing.value ? h(Manager,{accounts,onClose:()=>managing.value=false}) : h('div',{class:'wx-body', 'data-fixture-chat':true},[h('h2','聊天'),h('p','这里是原聊天，添加表情后继续留在这里。'),h(Picker,{ref:picker,stickers:accounts.user.表情包,onAdd:()=>importing.value=true,onManage:()=>managing.value=true,onSend:(name:string)=>fixture.lastSent=name})]),
  importing.value ? h(Importer,{accounts,accountId:'user',chooseFiles:true,onSaved:()=>picker.value?.clearSearch(),onClose:()=>importing.value=false}) : null,
  imageCropRequest.value ? h(Cropper,{request:imageCropRequest.value}) : null
]);}}).mount('#app');
`,
);
let server;
let browser;
let socket;
let closeBrowser;
async function run() {
  await new Promise((resolve, reject) =>
    webpack(
      {
        mode: 'development',
        context: root,
        entry: path.join(temporary, 'entry.ts'),
        output: { path: temporary, filename: 'bundle.js' },
        resolve: {
          extensions: ['.ts', '.js', '.vue'],
          modules: ['node_modules', path.join(root, 'node_modules')],
          alias: {
            [path.join(root, 'src/手机界面/store/StatStore.ts')]: path.join(temporary, 'store.ts'),
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
          new webpack.DefinePlugin({
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
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script src="/bundle.js"></script>',
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
  await command('Page.setInterceptFileChooserDialog', { enabled: true });
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
  await waitFor(`document.querySelectorAll('.wx-stickers-tile').length===20`);
  assert.equal(await evaluate(`document.querySelectorAll('.wx-stickers-check').length`), 0);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  assert.equal(
    await evaluate(`document.querySelector('.wx-stickers-tile').getBoundingClientRect().bottom < innerHeight`),
    true,
    '首屏可见图片',
  );
  await screenshot('browse-390');
  await click('＋ 添加表情');
  await waitFor(`!!document.querySelector('.wx-sticker-sources')`);
  await click('从图库选择');
  await waitFor(`document.querySelectorAll('.wx-library-grid button').length===100`);
  assert.equal(
    await evaluate(`!!document.querySelector('.wx-library input[type=file]')`),
    false,
    '选图不展示图库上传工具',
  );
  await evaluate(`document.querySelector('.wx-library-grid button').click()`);
  await waitFor(`!!document.querySelector('.wx-sticker-import-item.single')`);
  assert.equal(
    await evaluate(`document.querySelector('.wx-sticker-import-item input').disabled`),
    true,
    '图库已有表情直接复用名称',
  );
  await click('保存');
  await waitFor(`!document.querySelector('.wx-sticker-sheet')`);
  await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 640, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await screenshot('browse-320');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 720, deviceScaleFactor: 1, mobile: true });
  await click('整理');
  await waitFor(`document.querySelectorAll('.wx-stickers-check').length===20`);
  await evaluate(
    `document.querySelectorAll('.wx-stickers-tile')[0].click();document.querySelectorAll('.wx-stickers-tile')[1].click()`,
  );
  await screenshot('organize');
  await click('移除所选');
  await waitFor(`Object.keys(stickerFixture.accounts.user.表情包).length===18`);
  await click('取消');
  await click('全部表情');
  await waitFor(`document.querySelectorAll('.wx-stickers-tile').length===100`);
  await evaluate(
    `const input=document.querySelector('[aria-label="搜索表情"]');input.value='表情099';input.dispatchEvent(new Event('input',{bubbles:true}));`,
  );
  await waitFor(`document.querySelectorAll('.wx-stickers-tile').length===1`);
  await evaluate(`document.querySelector('.wx-stickers-tile').click()`);
  await waitFor(`!!document.querySelector('.wx-sticker-sheet')`);
  assert.equal(await evaluate(`!!document.activeElement.closest('.wx-sticker-sheet')`), true, '详情焦点进入弹窗');
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
    modifiers: 8,
  });
  assert.equal(await evaluate(`document.activeElement.textContent.trim()`), '归档表情', 'Shift+Tab 在弹窗内循环');
  await screenshot('detail');
  await click('添加到当前账号');
  await waitFor(`stickerFixture.accounts.user.表情包.表情099==='sticker://表情099'`);
  await click('‹ 返回');
  await waitFor(`!!document.querySelector('[data-fixture-chat]')`);
  await evaluate(
    `stickerFixture.accounts.user.表情包=Object.fromEntries(Object.keys(getVariables().magicGirlWeChatStickerLibrary).map(name=>[name,'sticker://'+name]));`,
  );
  await waitFor(`document.querySelectorAll('.wx-sticker-choice').length===100`);
  assert.equal(
    await evaluate(`document.querySelector('.wx-sticker-picker-actions').getBoundingClientRect().bottom < innerHeight`),
    true,
    '百张时聊天添加仍在可见面板头部',
  );
  await screenshot('chat-picker');
  await evaluate(
    `const search=document.querySelector('[aria-label="搜索我的表情"]');search.value='表情099';search.dispatchEvent(new Event('input',{bubbles:true}));`,
  );
  await waitFor(`document.querySelectorAll('.wx-sticker-choice').length===1`);
  await evaluate(`document.querySelector('.wx-sticker-choice').click()`);
  assert.equal(await evaluate(`stickerFixture.lastSent`), '表情099', '正式聊天选择器按名称发出发送事件');
  await click('＋ 添加');
  await waitFor(`!!document.querySelector('.wx-sticker-sheet input[type=file]')`);
  const png = Buffer.from(
    await evaluate(
      `(()=>{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;const context=canvas.getContext('2d');context.fillStyle='#f6d56c';context.fillRect(20,20,120,120);context.fillStyle='#34455b';context.font='48px sans-serif';context.textAlign='center';context.fillText('新',80,100);return canvas.toDataURL().split(',')[1];})()`,
    ),
    'base64',
  );
  const setFile = async name => {
    const filename = path.join(temporary, name + '.png');
    fs.writeFileSync(filename, png);
    const { root: dom } = await command('DOM.getDocument');
    const { nodeId } = await command('DOM.querySelector', {
      nodeId: dom.nodeId,
      selector: '.wx-sticker-sheet input[type=file]',
    });
    await command('DOM.setFileInputFiles', { nodeId, files: [filename] });
    await waitFor(`document.querySelectorAll('.wx-sticker-import-item').length===1`);
  };
  await setFile('快速表情');
  assert.equal(await evaluate(`!!document.querySelector('.wx-sticker-import-item.single')`), true);
  await evaluate(
    `(()=>{const field=document.querySelector('.wx-sticker-import-item input');field.value='快速表情改名';field.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  );
  await screenshot('add-single');
  await click('保存');
  await waitFor(`!document.querySelector('.wx-sticker-sheet')`);
  assert.equal(
    await evaluate(
      `!!document.querySelector('[data-fixture-chat]') && stickerFixture.accounts.user.表情包.快速表情改名==='sticker://快速表情改名'`,
    ),
    true,
    '保存后仍留在聊天',
  );
  assert.equal(
    await evaluate(
      `document.querySelector('.wx-sticker-search').value==='' && document.querySelector('.wx-sticker-choice').getAttribute('aria-label')==='发送 快速表情改名'`,
    ),
    true,
    '保存后清空搜索，新表情可直接选用',
  );
  await click('＋ 添加');
  await waitFor(`!!document.querySelector('.wx-sticker-sheet')`);
  await setFile('失败重试');
  await evaluate(`stickerFixture.failSave=true`);
  await click('保存');
  await waitFor(`document.querySelector('.wx-sticker-error')?.textContent.includes('保存未完成')`);
  await screenshot('retry');
  await evaluate(`stickerFixture.failSave=false`);
  await click('保存');
  await waitFor(`!document.querySelector('.wx-sticker-sheet')`);
  assert.equal(await evaluate(`stickerFixture.accounts.user.表情包.失败重试==='sticker://失败重试'`), true);
  await click('＋ 添加');
  await waitFor(`!!document.querySelector('.wx-sticker-sheet')`);
  const files = ['批量甲', '批量乙'].map(name => {
    const filename = path.join(temporary, name + '.png');
    fs.writeFileSync(filename, png);
    return filename;
  });
  const { root: batchDom } = await command('DOM.getDocument');
  const { nodeId: batchInput } = await command('DOM.querySelector', {
    nodeId: batchDom.nodeId,
    selector: '.wx-sticker-sheet input[type=file]',
  });
  await command('DOM.setFileInputFiles', { nodeId: batchInput, files });
  await waitFor(`document.querySelectorAll('.wx-sticker-import-item').length===2`);
  assert.equal(await evaluate(`!!document.querySelector('.wx-sticker-import-item.single')`), false, '多图才展示列表');
  await screenshot('add-batch');
  const writesBeforeBatch = await evaluate(`stickerFixture.writes`);
  await click('保存');
  await waitFor(`!document.querySelector('.wx-sticker-sheet')`);
  assert.equal(await evaluate(`stickerFixture.writes`), writesBeforeBatch + 1, '多图仅提交一次账号更新');
  assert.equal(
    await evaluate(`!!stickerFixture.accounts.user.表情包.批量甲 && !!stickerFixture.accounts.user.表情包.批量乙`),
    true,
  );
  assert.deepEqual(browserErrors, [], '浏览器无运行时异常');
  console.info(
    'Edge 真实组件验证通过：390/320 窄屏、首屏图片、显式整理、百张搜索/详情、单图添加、保存后留在聊天 fixture、失败重试。',
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
