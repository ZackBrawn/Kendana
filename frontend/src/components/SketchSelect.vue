<script setup>
defineOptions({ inheritAttrs: false });

import { RBox, RGraphicsConfig } from 'roughness';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: undefined
  },
  options: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1.2, bowing: 1, seed: -3 }">
    <div v-bind="$attrs" class="sketch-select">
      <RBox tag="div" class="sketch-select__box">
        <select
          :value="props.modelValue"
          @change="emit('update:modelValue', $event.target.value)"
        >
          <option v-for="opt in props.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
          <slot />
        </select>
        <span class="sketch-select__caret" aria-hidden="true">▾</span>
      </RBox>
    </div>
  </RGraphicsConfig>
</template>
