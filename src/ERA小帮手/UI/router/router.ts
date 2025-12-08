import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/Layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/AsyncAnalyze',
      children: [
        {
          path: '/AsyncAnalyze',
          name: 'AsyncAnalyze',
          component: () => import('../view/AsyncAnalyze.vue'),
        },
      ],
    },
  ],
});
