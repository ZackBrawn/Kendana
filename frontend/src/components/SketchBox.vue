<script setup>
defineOptions({ inheritAttrs: false });

import { RBox, RGraphicsConfig } from 'roughness';

const props = defineProps({
  tag: {
    type: String,
    default: 'div'
  }
});
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1, bowing: 1, seed: -9 }">
    <RBox :tag="props.tag" v-bind="$attrs" class="sketch-box">
      <slot />
    </RBox>
  </RGraphicsConfig>
</template>
