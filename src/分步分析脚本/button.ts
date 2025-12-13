/**
 * 注册酒馆助手按钮
 */
import { useUiStore } from './UI/store';
import { reSendEraUpdate } from './UI/handleEvents';

$(() => {
  replaceScriptButtons([
    { name: '分步分析设置', visible: true },
    { name: '重新分析变量', visible: true }
  ]);

  eventOn(getButtonEvent('分步分析设置'), () => {
    useUiStore().showUI = !useUiStore().showUI;
  });

  eventOn(getButtonEvent('重新分析变量'), async () => {
    await reSendEraUpdate();
  });
});
