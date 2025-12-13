import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/世界信息',
      children: [
        {
          path: '/世界信息',
          name: '世界信息',
          component: () => import('../view/世界信息.vue'),
        },
        {
          path: '/user',
          name: 'user',
          component: () => import('../view/user.vue'),
        },
        {
          path: '/卡特琳娜',
          name: '卡特琳娜',
          component: () => import('../view/卡特琳娜.vue'),
        },
        {
          path: '/任务',
          name: '任务',
          component: () => import('../view/任务.vue'),
        },
        {
          path: '/选项',
          name: '选项',
          component: () => import('../view/选项.vue'),
        },
      ],
    },
  ],
});
