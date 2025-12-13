import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router/router'
import { createPinia } from 'pinia'
import { useStatStore } from './store/StatStore';
import { useMessageStore } from './store/MessageStore';

// 创建 Pinia 实例并注册持久化插件
const pinia = createPinia()

const app = createApp(App)
app.use(pinia)
app.use(router)

app.mount('#app')

// 注册事件监听器
useStatStore().registerListener()
useMessageStore().registerListener()
useStatStore().initData();
useMessageStore().getMessage();
