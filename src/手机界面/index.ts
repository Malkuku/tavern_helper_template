import { startFloatingUi } from '@/util/floatingUi';
import { useMagicGirlStatStore } from './store/StatStore';
import App from './App.vue';

startFloatingUi({
  component: App,
  initialize: ({ pinia }) => useMagicGirlStatStore(pinia).initialize(),
});
