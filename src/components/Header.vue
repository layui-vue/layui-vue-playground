<script setup lang="ts">
import {
  getSupportedEpVersions,
  getSupportedTSVersions,
  getSupportedVueVersions,
} from '@/utils/dependency'
import type { Ref } from 'vue'
import type { ReplStore, VersionKey } from '@/composables/store'

const appVersion = import.meta.env.APP_VERSION
const replVersion = import.meta.env.REPL_VERSION

const emit = defineEmits<{
  (e: 'refresh'): void
}>()
const nightly = ref(false)
const dark = useDark()
const toggleDark = useToggle(dark)

const { store } = defineProps<{
  store: ReplStore
}>()

interface Version {
  text: string
  published: Ref<string[]>
  active: string
}

const versions = reactive<Record<VersionKey, Version>>({
  layuiVue: {
    text: 'layui-vue',
    published: getSupportedEpVersions(),
    active: store.versions.layuiVue,
  },
  vue: {
    text: 'Vue',
    published: getSupportedVueVersions(),
    active: store.versions.vue,
  },
  typescript: {
    text: 'TypeScript',
    published: getSupportedTSVersions(),
    active: store.versions.typescript,
  },
})

async function setVersion(key: VersionKey, v: string) {
  versions[key].active = `loading...`
  await store.setVersion(key, v)
  versions[key].active = v
}

const toggleNightly = () => {
  store.toggleNightly()
  setVersion('layuiVue', 'latest')
}

async function copyLink() {
  await navigator.clipboard.writeText(location.href)
  // ElMessage.success('Sharable URL has been copied to clipboard.')
}

function refreshView() {
  emit('refresh')
}
</script>

<template>
  <nav>
    <div leading="[var(--nav-height)]" m-0 flex items-center font-medium>
      <img
        relative
        mr-2
        h-24px
        v="mid"
        top="-2px"
        alt="logo"
        src="../assets/logo.jpg"
      />
      <div flex="~ gap-1" items-center lt-sm-hidden>
        <div text-xl>Layui vue Playground</div>
        <lay-tag type="primary" variant="light"
          >v{{ appVersion }}, repl v{{ replVersion }}</lay-tag
        >
        <!-- <lay-tag v-if="store.pr" size="xs">PR {{ store.pr }}</lay-tag> -->
      </div>
    </div>

    <div flex="~ gap-2" items-center>
      <div
        v-for="(v, key) of versions"
        :key="key"
        flex="~ gap-2"
        items-center
        lt-lg-hidden
      >
        <span>{{ v.text }}:</span>
        <lay-select
          :model-value="
            v.active === 'latest'
              ? v.published.find((v) => !/[a-zA-Z]/.test(v))
              : v.active
          "
          size="xs"
          fit-input-width
          @update:model-value="setVersion(key, $event)"
        >
          <lay-select-option v-for="ver of v.published" :key="ver" :value="ver">
            {{ ver }}
          </lay-select-option>
        </lay-select>
      </div>

      <div flex="~ gap-4" text-lg>
        <button i-ri-refresh-line hover:color-primary @click="refreshView" />
        <button i-ri-share-line hover:color-primary @click="copyLink" />
        <button
          i-ri-sun-line
          dark:i-ri-moon-line
          hover:color-primary
          @click="toggleDark()"
        />
        <a
          href="https://github.com/layui-vue/layui-vue-playground"
          target="_blank"
          flex
          hover:color-primary
        >
          <button title="View on GitHub" i-ri-github-fill />
        </a>

        <lay-dropdown trigger="click" width="300px">
          <button i-ri:settings-line hover:color-primary />

          <template #content>
            <Settings p-10px p-b-0 />
          </template>
        </lay-dropdown>
      </div>
    </div>
  </nav>
</template>

<style lang="scss">
nav {
  --bg: #fff;
  --bg-light: #fff;
  --border: #ddd;

  --at-apply: 'box-border flex justify-between px-4 z-999 relative';

  height: var(--nav-height);
  background-color: var(--bg);
  box-shadow: 0 0 6px var(--global-checked-color);

  .layui-select {
    width: 140px;
  }
}

.dark nav {
  --bg: #1a1a1a;
  --bg-light: #242424;
  --border: #383838;

  --at-apply: 'shadow-none';
  border-bottom: 1px solid var(--border);
}
</style>
