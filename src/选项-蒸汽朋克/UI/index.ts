import { startFloatingUi } from '@/util/floatingUi';
import { useMessageStore } from '@/选项-蒸汽朋克/UI/store/MessageStore';
import { useUiStore } from '@/选项-蒸汽朋克/UI/store/UIStore';
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
