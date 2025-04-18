import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import '@vue/repl/style.css'
// import '@layui/layui-vue/lib/index.css'
import 'uno.css'
import App from '@/App.vue'

// @ts-expect-error Custom window property
window.VUE_DEVTOOLS_CONFIG = {
  defaultSelectedAppId: 'repl',
}

createApp(App).mount('#app')
