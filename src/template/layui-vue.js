import { getCurrentInstance } from 'vue'
import Layui from '@layui/layui-vue'
import LayJsonSchemaForm from '@layui/json-schema-form'

let installed = false
await loadStyle()

export function setupLayuiVue() {
  if (installed) return
  const instance = getCurrentInstance()
  instance.appContext.app.use(Layui)
  instance.appContext.app.use(LayJsonSchemaForm)
  installed = true
}

export function loadStyle() {
  const styles = ['#STYLE#', '#JSON_SCHEMA_FORM_STYLE#'].map((style) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = style
      link.addEventListener('load', resolve)
      link.addEventListener('error', reject)
      document.body.append(link)
    })
  })
  return Promise.all(styles)
}
