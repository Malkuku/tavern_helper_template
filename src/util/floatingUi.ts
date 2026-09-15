import { createPinia } from 'pinia';
import { createApp } from 'vue';
import type { Pinia } from 'pinia';
import type { App as VueApp, Component, Plugin } from 'vue';

interface FloatingUiContext {
  pinia: Pinia;
  refreshStyle: () => void;
}

interface FloatingUiOptions {
  component: Component;
  plugins?: Plugin[];
  initialize?: (context: FloatingUiContext) => void | (() => void);
}

function createMountPoint(): JQuery<HTMLDivElement> {
  return $('<div>').attr('id', `era-ui-mount-point-${getScriptId()}`).css({
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    'z-index': 10000,
  }) as JQuery<HTMLDivElement>;
}

function teleportStyle(): void {
  const scriptId = getScriptId();
  $(`head > div[script_id="${scriptId}"]`).remove();

  const styleContainer = $('<div>').attr('script_id', scriptId).append($(document).find('head > style').clone());
  $('head').append(styleContainer);
}

function deteleportStyle(): void {
  $(`head > div[script_id="${getScriptId()}"]`).remove();
}

export function startFloatingUi({ component, plugins = [], initialize }: FloatingUiOptions): void {
  let vueApp: VueApp | null = null;
  let mountPoint: JQuery<HTMLDivElement> | null = null;
  let cleanup: (() => void) | undefined;

  const unload = () => {
    console.debug('unloadUI', 'UI 脚本开始卸载');
    cleanup?.();
    cleanup = undefined;

    if (vueApp) {
      console.debug('unmountVueApp', '卸载 Vue 实例');
      vueApp.unmount();
      vueApp = null;
    }

    deteleportStyle();
    if (mountPoint) {
      console.debug('unloadUI', '销毁挂载点');
      mountPoint.remove();
      mountPoint = null;
    }

    window.removeEventListener('pagehide', unload);
    eventClearAll();
    console.debug('unloadUI', 'UI 脚本卸载完成');
  };

  $(() => {
    console.log('initialize', 'UI 脚本开始初始化');
    mountPoint = createMountPoint();
    $('body').append(mountPoint);

    const app = createApp(component);
    vueApp = app;
    const pinia = createPinia();
    app.use(pinia);
    plugins.forEach(plugin => app.use(plugin));
    app.mount(mountPoint[0]);

    teleportStyle();
    window.removeEventListener('pagehide', unload);
    window.addEventListener('pagehide', unload);

    const initializationCleanup = initialize?.({ pinia, refreshStyle: teleportStyle });
    cleanup = typeof initializationCleanup === 'function' ? initializationCleanup : undefined;
    console.debug('initialize', 'Vue App 已挂载，样式已传送');
  });
}
