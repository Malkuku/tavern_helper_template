import { startFloatingUi } from '@/util/floatingUi';
import { useMessageStore } from '@/变量卷轴/UI/store/MessageStore';
import { useUiStore } from '@/变量卷轴/UI/store/UIStore';
import App from './App.vue';

startFloatingUi({
  component: App,
  initialize: ({ pinia }) => {
    (window as any).UiStore = useUiStore(pinia);
    const messageStore = useMessageStore(pinia);
    messageStore.registerListener();
    messageStore.getMessage();
  },
});
