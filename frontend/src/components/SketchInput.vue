<script setup>
defineOptions({ inheritAttrs: false });

import { RInput, RGraphicsConfig } from 'roughness';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: undefined
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1.2, bowing: 1, seed: -3 }">
    <RInput
      :model-value="props.modelValue"
      v-bind="$attrs"
      class="sketch-input"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </RGraphicsConfig>
</template>
