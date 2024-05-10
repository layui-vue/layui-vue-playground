import { getCurrentInstance } from 'vue'
import LayuiVue from '@layui/layui-vue'
import LayJsonSchemaForm from '@layui/json-schema-form'

let installed = false
await loadStyle()

export function setupLayuiVue() {
  if (installed) return
  const instance = getCurrentInstance()
  instance.appContext.app.use(LayuiVue)
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

      const _style = document.createElement('style')
      _style.type = 'text/css'
      _style.innerHTML = 'body{padding:8px !important;}'
      document.head.append(_style)
    })
  })
  return Promise.all(styles)
}
