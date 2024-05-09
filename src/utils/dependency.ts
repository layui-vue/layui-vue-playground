import { gte } from 'semver'
import type { Ref } from 'vue'
import type { MaybeRef } from '@vueuse/core'
import type { Versions } from '@/composables/store'
import type { ImportMap } from '@/utils/import-map'

export interface Dependency {
  pkg?: string
  version?: string
  path: string
}

export type Cdn = 'unpkg' | 'jsdelivr' | 'jsdelivr-fastly'
export const cdn = useLocalStorage<Cdn>('setting-cdn', 'jsdelivr-fastly')

export const genCdnLink = (
  pkg: string,
  version: string | undefined,
  path: string,
) => {
  version = version ? `@${version}` : ''
  switch (cdn.value) {
    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/npm/${pkg}${version}${path}`
    case 'jsdelivr-fastly':
      return `https://fastly.jsdelivr.net/npm/${pkg}${version}${path}`
    case 'unpkg':
      return `https://unpkg.com/${pkg}${version}${path}`
  }
}

export const genVueLink = (version: string) => {
  const compilerSfc = genCdnLink(
    '@vue/compiler-sfc',
    version,
    '/dist/compiler-sfc.esm-browser.js',
  )
  const runtimeDom = genCdnLink(
    '@vue/runtime-dom',
    version,
    '/dist/runtime-dom.esm-browser.js',
  )
  return {
    compilerSfc,
    runtimeDom,
  }
}

export const genImportMap = ({
  vue,
  layuiVue,
}: Partial<Versions> = {}): ImportMap => {
  const deps: Record<string, Dependency> = {
    vue: {
      pkg: '@vue/runtime-dom',
      version: vue,
      path: '/dist/runtime-dom.esm-browser.js',
    },
    '@vue/shared': {
      version: vue,
      path: '/dist/shared.esm-bundler.js',
    },
    '@layui/layui-vue': {
      pkg: '@layui/layui-vue',
      version: layuiVue,
      path: '/es/index.js',
    },
    '@layui/json-schema-form': {
      pkg: '@layui/json-schema-form',
      version: 'latest',
      path: '/lib/json-schema-form.es.js',
    },
    '@layui/layer-vue': {
      pkg: '@layui/layer-vue',
      version: 'latest',
      path: '/lib/layer-vue.es.js',
    },
  }

  return {
    imports: Object.fromEntries(
      Object.entries(deps).map(([key, dep]) => [
        key,
        genCdnLink(dep.pkg ?? key, dep.version, dep.path),
      ]),
    ),
  }
}

export const getVersions = (pkg: MaybeRef<string>) => {
  const url = computed(
    () => `https://data.jsdelivr.com/v1/package/npm/${unref(pkg)}`,
  )
  return useFetch(url, {
    initialData: [],
    afterFetch: (ctx) => ((ctx.data = ctx.data.versions), ctx),
    refetch: true,
  }).json<string[]>().data as Ref<string[]>
}

export const getSupportedVueVersions = () => {
  const versions = getVersions('vue')
  return computed(() =>
    versions.value.filter((version) => gte(version, '3.2.0')),
  )
}

export const getSupportedTSVersions = () => {
  const versions = getVersions('typescript')
  return computed(() =>
    versions.value.filter(
      (version) => !version.includes('dev') && !version.includes('insiders'),
    ),
  )
}

export const getSupportedEpVersions = () => {
  const pkg = computed(() => '@layui/layui-vue')
  const versions = getVersions(pkg)
  return computed(() => {
    return versions.value.filter((version) => gte(version, '1.1.0-beta.18'))
  })
}
