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
          path: '/星宫',
          name: '星宫',
          component: () => import('../view/星宫.vue'),
        },
        {
          path: '/白石',
          name: '白石',
          component: () => import('../view/白石.vue'),
        },
        {
          path: '/橘',
          name: '橘',
          component: () => import('../view/橘.vue'),
        },
        {
          path: '/梦',
          name: '梦',
          component: () => import('../view/梦.vue'),
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
