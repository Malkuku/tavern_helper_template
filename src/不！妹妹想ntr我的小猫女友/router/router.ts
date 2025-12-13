import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/状态界面',
      children: [
        { path: '/状态界面', component: () => import('../view/状态界面.vue') },
        { path: '/世界信息', component: () => import('../view/世界信息.vue') },
        { path: '/多多日记', component: () => import('../view/多多日记.vue') },
        { path: '/角色状态', component: () => import('../view/角色状态.vue') },
      ],
    },
  ],
});
