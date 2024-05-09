<script setup lang="ts">
import { cdn } from '@/utils/dependency'
</script>

<template>
  <lay-form>
    <lay-form-item label="CDN">
      <lay-select v-model="cdn" size="xs" w-140px w-full>
        <lay-select-option value="jsdelivr" label="jsDelivr" />
        <lay-select-option value="jsdelivr-fastly" label="jsDelivr Fastly" />
        <lay-select-option value="unpkg" label="unpkg" />
      </lay-select>
    </lay-form-item>
  </lay-form>
</template>
