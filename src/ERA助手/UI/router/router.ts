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
        {
          path: '/EraDataHandle',
          name: 'EraDataHandle',
          component: () => import('../view/EraDataHandle.vue'),
        },
        {
          path: '/EraDataEdit',
          name: 'EraDataEdit',
          component: () => import('../view/EraDataEditor.vue'),
        },
        {
          path: '/tempTest',
          name: 'tempTest',
          component: () => import('../view/MyTempTest.vue'),
        },
        {
          path: '/Version',
          name: 'Version',
          component: () => import('../view/VersionInformation.vue'),
        }
      ],
    },
  ],
});
