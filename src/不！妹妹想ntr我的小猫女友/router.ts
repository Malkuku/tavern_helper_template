import { createMemoryHistory, createRouter } from 'vue-router';
import App from './display.vue';
import Layout from './layout.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: '/状态界面', component: () => import('./状态界面.vue') },
        { path: '/世界信息', component: () => import('./世界信息.vue') },
        { path: '/多多日记', component: () => import('./多多日记.vue') },
      ],
    },
  ],
});
router.replace('/状态界面');

$(() => {
  createApp(App).use(router).mount('#app');
});
