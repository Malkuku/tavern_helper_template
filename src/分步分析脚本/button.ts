/**
 * 注册酒馆助手按钮
 */
import { useUiStore } from './UI/store';

$(() => {
  replaceScriptButtons([{ name: '按钮', visible: true }]);

  eventOn(getButtonEvent('按钮'), () => {
    useUiStore().showUI = !useUiStore().showUI;
    console.log('按钮被点击');
  });
});
