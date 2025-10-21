import { createMemoryHistory, createRouter } from 'vue-router';
import Layout from '../view/layout.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {path: '/user', component: () => import('../view/user.vue')},
        {path: '/林安安', component: () => import('../view/林安安.vue')},
        {path: '/李沐', component: () => import('../view/李沐.vue')},
        {path: '/苏浅浅', component: () => import('../view/苏浅浅.vue')},
        {path: '/张小花', component: () => import('../view/张小花.vue')}
      ],
    },
  ],
});
