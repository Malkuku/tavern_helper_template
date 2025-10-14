import {createApp} from 'vue'
import App from './App.vue'
import {router} from './router/router'
import {createPinia} from 'pinia';
import { useStatStore } from './store/StatStore';
import { useMessageStore } from './store/MessageStore';

const pinia = createPinia();

const app = createApp(App)
app.use(pinia)
app.use(router)

app.mount('#app');

//注册事件监听器
useStatStore().registerListener();
useMessageStore().registerListener();
