import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/世界',
      children: [
        {
          path: '世界',
          component: () => import('../view/世界.vue'),
        },
        {
          path: '角色',
          component: () => import('../view/人物.vue'),
        },
        {
          path: '设置',
          component: () => import('../view/设置.vue'),
        },
      ],
    },
  ],
});
