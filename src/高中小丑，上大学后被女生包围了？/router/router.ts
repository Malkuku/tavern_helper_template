import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {path: '/test1', component: () => import('../view/人物状态.vue')},
        {path: '/test2', component: () => import('../view/test.vue')},
        {path: '/test3', component: () => import('../view/test.vue')},
        {path: '/test4', component: () => import('../view/test.vue')},
      ],
    },
  ],
});
