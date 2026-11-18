<script setup>
defineOptions({ inheritAttrs: false });

import { RSwitch, RGraphicsConfig } from 'roughness';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1.2, bowing: 1, seed: -3 }">
    <RSwitch
      :model-value="props.modelValue"
      v-bind="$attrs"
      class="sketch-switch"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <slot />
    </RSwitch>
  </RGraphicsConfig>
</template>
