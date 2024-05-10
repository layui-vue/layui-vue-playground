await loadStyle()
await loadLib()

export function loadStyle() {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '#LAYUI_LIB_STYLE#'
    link.addEventListener('load', resolve)
    link.addEventListener('error', reject)
    document.head.append(link)

    const style = document.createElement('style')
    style.type = 'text/css'
    style.innerHTML = 'body{padding:8px !important;}'
    document.head.append(style)
  })
}

export function loadLib() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '#LAYUI_LIB#'
    script.addEventListener('load', resolve)
    script.addEventListener('error', reject)
    document.body.append(script)
  })
}
