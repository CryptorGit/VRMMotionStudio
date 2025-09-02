import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ikConfigPromise } from './utils/ik'

async function bootstrap() {
  await ikConfigPromise
  createApp(App).mount('#app')
}

bootstrap()
