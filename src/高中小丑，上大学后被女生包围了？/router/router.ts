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
        {path: '/user', component: () => import('../view/user.vue')},
        {path: '/林安安', component: () => import('../view/林安安.vue')},
        {path: '/李沐', component: () => import('../view/李沐.vue')},
        {path: '/苏浅浅', component: () => import('../view/苏浅浅.vue')},
        {path: '/张小花', component: () => import('../view/张小花.vue')},
        {path: '/TODOLIST', component: () => import('../view/TODOLIST.vue')},
        {path: '/选项', component: () => import('../view/选项.vue')},
        {path: '/世界信息', component: () => import('../view/世界信息.vue') },
      ],
    },
  ],
});
