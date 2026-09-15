import { startFloatingUi } from '@/util/floatingUi';
import { useStatWatcher } from '@/尘史使徒/UI/composables/panel/useStatWatcher';
import { useAudioStore } from '@/尘史使徒/UI/store/AudioStore';
import { useMessageStore } from '@/尘史使徒/UI/store/MessageStore';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { useUiStore } from '@/尘史使徒/UI/store/UIStore';
import App from './App.vue';
import { router } from './router/router';

startFloatingUi({
  component: App,
  plugins: [router],
  initialize: ({ pinia, refreshStyle }) => {
    (window as any).UiStore = useUiStore(pinia);

    const styleRefreshTimers = new Set<number>();
    const removeRouterHook = router.afterEach(() => {
      const timer = window.setTimeout(() => {
        styleRefreshTimers.delete(timer);
        refreshStyle();
      }, 50);
      styleRefreshTimers.add(timer);
    });

    useUiStore(pinia).getModeSetting();
    const statStore = useStatStore(pinia);
    statStore.registerListener();
    statStore.initData();
    useMessageStore(pinia).getMessage();
    useAudioStore(pinia).initAudioResources();
    useStatWatcher();

    return () => {
      removeRouterHook();
      styleRefreshTimers.forEach(timer => window.clearTimeout(timer));
      styleRefreshTimers.clear();
    };
  },
});
