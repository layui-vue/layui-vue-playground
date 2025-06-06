import { File, type Store, type StoreState, compileFile } from '@vue/repl'
import { atou, utoa } from '@/utils/encode'
import { genCdnLink, genImportMap, genVueLink } from '@/utils/dependency'
import { type ImportMap, mergeImportMap } from '@/utils/import-map'
import { IS_DEV } from '@/constants'
import mainCode from '../template/main.vue?raw'
import welcomeCode from '../template/welcome.vue?raw'
import layuiHtmlCode from '../template/layui.html?raw'
import layuiVueCode from '../template/layui-vue.js?raw'
import layuiCode from '../template/layui.js?raw'
import tsconfigCode from '../template/tsconfig.json?raw'
import type { UnwrapNestedRefs } from 'vue'

export interface Initial {
  serializedState?: string
  versions?: Versions
  userOptions?: UserOptions
  pr?: string | null
}

export type MainLib = 'layui' | 'layuiVue'
export type VersionKey = 'vue' | 'layuiVue' | 'typescript' | 'layui'
export type Versions = Record<VersionKey, string>
export interface UserOptions {
  styleSource?: string
  showHidden?: boolean
}
export type SerializeState = Record<string, string> & {
  _o?: UserOptions
}

const MAIN_FILE = 'src/PlaygroundMain.vue'
const APP_FILE = 'src/App.vue'
const LAYUI_HTML_FILE = 'src/layui.html'
const LAYUI_VUE_FILE = 'src/layui-vue.js'
const LAYUI_FILE = 'src/layui.js'
const LEGACY_IMPORT_MAP = 'src/import_map.json'
export const IMPORT_MAP = 'import-map.json'
export const TSCONFIG = 'tsconfig.json'

export const useStore = (initial: Initial) => {
  const libName = ref<MainLib>(
    window.location.search.includes('deps=layui') ? 'layui' : 'layuiVue',
  )

  const versions = reactive(
    initial.versions ||
      ({
        vue: 'latest',
        layuiVue: 'latest',
        typescript: 'latest',
        layui: 'latest',
      } satisfies Versions),
  )

  const compiler = shallowRef<typeof import('vue/compiler-sfc')>()
  const userOptions = ref<UserOptions>(initial.userOptions || {})
  const hideFile = computed(() => !IS_DEV && !userOptions.value.showHidden)

  const _files = initFiles(initial.serializedState || '')

  let activeFile =
    _files[libName.value === 'layuiVue' ? APP_FILE : LAYUI_HTML_FILE]
  if (!activeFile) activeFile = Object.values(_files)[0]

  const state: StoreState = reactive({
    mainFile: libName.value === 'layuiVue' ? MAIN_FILE : LAYUI_HTML_FILE,
    files: _files,
    activeFile,
    errors: [],
    vueRuntimeURL: '',
    vueServerRendererURL: '',
    typescriptVersion: computed(() => versions.typescript),
    resetFlip: false,
    locale: undefined,
    dependencyVersion: computed(() => ({
      '@layui/layui-vue': versions.layuiVue,
    })),
  })

  const bultinImportMap = computed<ImportMap>(() => genImportMap(versions))
  const userImportMap = computed<ImportMap>(() => {
    const code = state.files[IMPORT_MAP]?.code.trim()
    if (!code) return {}
    let map: ImportMap = {}
    try {
      map = JSON.parse(code)
    } catch (error) {
      console.error(error)
    }
    return map
  })
  const importMap = computed<ImportMap>(() =>
    mergeImportMap(bultinImportMap.value, userImportMap.value),
  )

  // eslint-disable-next-line no-console
  console.log('Files:', state.files, 'Options:', userOptions)

  const store = reactive<Store>({
    state,
    compiler: compiler as any,
    initialShowOutput: false,
    initialOutputMode: 'preview',
    init,
    setActive,
    addFile,
    deleteFile,
    getImportMap,
    renameFile,
    getTsConfig,
    reloadLanguageTools: undefined,
  })

  watch(
    () => versions.layuiVue,
    (version) => {
      const file = new File(
        LAYUI_VUE_FILE,
        generateLayuiVueCode(version, userOptions.value.styleSource).trim(),
        hideFile.value,
      )
      state.files[LAYUI_VUE_FILE] = file
      compileFile(store, file).then((errs) => (state.errors = errs))
    },
    { immediate: true },
  )

  watch(
    () => versions.layui,
    (version) => {
      const file = new File(
        LAYUI_FILE,
        generateLayuiCode(version, userOptions.value.styleSource).trim(),
        hideFile.value,
      )
      state.files[LAYUI_FILE] = file
      compileFile(store, file).then((errs) => (state.errors = errs))
    },
    { immediate: true },
  )

  // layui-vue
  function generateLayuiVueCode(version: string, styleSource?: string) {
    const style = styleSource
      ? styleSource.replace('#VERSION#', version)
      : genCdnLink('@layui/layui-vue', version, '/lib/index.css')
    return layuiVueCode
      .replace('#STYLE#', style)
      .replace(
        '#JSON_SCHEMA_FORM_STYLE#',
        genCdnLink('@layui/json-schema-form', 'latest', '/lib/index.css'),
      )
  }

  // layui
  function generateLayuiCode(version: string, styleSource?: string) {
    const style = styleSource
      ? styleSource.replace('#VERSION#', version)
      : genCdnLink('layui', version, '/dist/css/layui.css')
    return layuiCode
      .replace('#LAYUI_LIB_STYLE#', style)
      .replace('#LAYUI_LIB#', genCdnLink('layui', version, '/dist/layui.js'))
  }

  async function setVueVersion(version: string) {
    const { compilerSfc, runtimeDom } = genVueLink(version)

    compiler.value = await import(/* @vite-ignore */ compilerSfc)
    state.vueRuntimeURL = runtimeDom
    versions.vue = version

    // eslint-disable-next-line no-console
    console.info(`[@vue/repl] Now using Vue version: ${version}`)
  }

  let inited = false

  async function init() {
    if (inited) return

    await setVueVersion(versions.vue)

    state.errors = []
    for (const file of Object.values(state.files)) {
      compileFile(store, file).then((errs) => state.errors.push(...errs))
    }

    watchEffect(() =>
      compileFile(store, state.activeFile).then(
        (errs) => (state.errors = errs),
      ),
    )

    watch(
      () => [
        state.files[TSCONFIG]?.code,
        state.typescriptVersion,
        state.locale,
        state.dependencyVersion,
      ],
      useDebounceFn(() => store.reloadLanguageTools?.(), 300),
      { deep: true },
    )

    inited = true
  }

  function getFiles() {
    const exported: Record<string, string> = {}
    for (const file of Object.values(state.files)) {
      if (file.hidden) continue
      exported[file.filename] = file.code
    }
    return exported
  }

  function serialize() {
    const state: SerializeState = { ...getFiles() }
    state._o = userOptions.value
    return utoa(JSON.stringify(state))
  }
  function deserialize(text: string): SerializeState {
    const state = JSON.parse(atou(text))
    return state
  }

  function initFiles(serializedState: string) {
    const files: StoreState['files'] = {}
    if (serializedState) {
      const saved = deserialize(serializedState)
      for (let [filename, file] of Object.entries(saved)) {
        if (filename === '_o') continue
        if (
          ![IMPORT_MAP, TSCONFIG].includes(filename) &&
          !filename.startsWith('src/')
        ) {
          filename = `src/${filename}`
        }
        if (filename === LEGACY_IMPORT_MAP) {
          filename = IMPORT_MAP
        }
        files[filename] = new File(filename, file as string)
      }
      userOptions.value = saved._o || {}
    } else {
      // url中不带编码啊
      // 判断是layui | layuiVue
      if (libName.value === 'layuiVue') {
        files[APP_FILE] = new File(APP_FILE, welcomeCode)
      } else {
        files[LAYUI_HTML_FILE] = new File(LAYUI_HTML_FILE, layuiHtmlCode)
      }
    }

    files[MAIN_FILE] = new File(MAIN_FILE, mainCode, hideFile.value)
    if (!files[IMPORT_MAP]) {
      files[IMPORT_MAP] = new File(
        IMPORT_MAP,
        JSON.stringify({ imports: {} }, undefined, 2),
      )
    }
    if (!files[TSCONFIG]) {
      files[TSCONFIG] = new File(TSCONFIG, tsconfigCode)
    }
    return files
  }

  function setActive(filename: string) {
    const file = state.files[filename]
    if (file.hidden) return
    state.activeFile = state.files[filename]
  }

  function addFile(fileOrFilename: string | File) {
    const file =
      typeof fileOrFilename === 'string'
        ? new File(fileOrFilename)
        : fileOrFilename
    state.files[file.filename] = file
    setActive(file.filename)
  }

  function renameFile(oldFilename: string, newFilename: string) {
    const file = state.files[oldFilename]

    if (!file) {
      state.errors = [`Could not rename "${oldFilename}", file not found`]
      return
    }

    if (!newFilename || oldFilename === newFilename) {
      state.errors = [`Cannot rename "${oldFilename}" to "${newFilename}"`]
      return
    }

    if (
      file.hidden ||
      [
        APP_FILE,
        MAIN_FILE,
        LAYUI_VUE_FILE,
        LAYUI_HTML_FILE,
        IMPORT_MAP,
      ].includes(oldFilename)
    ) {
      state.errors = [`Cannot rename ${oldFilename}`]
      return
    }

    file.filename = newFilename

    const newFiles: Record<string, File> = {}

    // Preserve iteration order for files
    for (const name of Object.keys(_files)) {
      if (name === oldFilename) {
        newFiles[newFilename] = file
      } else {
        newFiles[name] = _files[name]
      }
    }

    state.files = newFiles
    compileFile(store, file)
  }

  function deleteFile(filename: string) {
    if (
      [
        LAYUI_VUE_FILE,
        MAIN_FILE,
        APP_FILE,
        IMPORT_MAP,
        LAYUI_HTML_FILE,
      ].includes(filename)
    ) {
      $layer.msg('You cannot remove it, because Element Plus requires it.')
      return
    }

    // if (
    //   await ElMessageBox.confirm(
    //     `Are you sure you want to delete ${filename.replace(/^src\//, '')}?`,
    //     {
    //       title: 'Delete File',
    //       type: 'warning',
    //       center: true,
    //     }
    //   )
    // ) {
    if (state.activeFile.filename === filename) {
      setActive(libName.value === 'layuiVue' ? APP_FILE : LAYUI_HTML_FILE)
    }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete state.files[filename]
    // }
  }

  function getImportMap() {
    return importMap.value
  }

  function getTsConfig() {
    try {
      return JSON.parse(state.files[TSCONFIG].code)
    } catch {
      return {}
    }
  }

  async function setVersion(key: VersionKey, version: string) {
    switch (key) {
      case 'vue':
        await setVueVersion(version)
        break
      case 'layuiVue':
        versions.layuiVue = version
        break
      case 'typescript':
        versions.typescript = version
        break
      case 'layui':
        versions.layui = version
        break
    }
  }

  const utils = {
    libName,
    versions,
    userOptions,
    pr: initial.pr,
    serialize,
    setVersion,
  }
  Object.assign(store, utils)

  return store as Omit<typeof store, 'init'> & {
    init: typeof init
  } & UnwrapNestedRefs<typeof utils>
}

export type ReplStore = ReturnType<typeof useStore>
