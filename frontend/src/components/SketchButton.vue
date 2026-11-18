<script setup>
defineOptions({ inheritAttrs: false });

import { RButton, RGraphicsConfig } from 'roughness';
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1.2, bowing: 1, seed: -3 }">
    <RButton v-bind="$attrs" class="sketch-btn">
      <slot />
    </RButton>
  </RGraphicsConfig>
</template>
