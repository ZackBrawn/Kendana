<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { RBox, RGraphicsConfig } from 'roughness';

defineOptions({ inheritAttrs: false });

defineProps({
  as: {
    type: String,
    default: 'div'
  }
});

const root = ref(null);
let observer = null;
let frame = 0;

function requestRedraw() {
  const box = root.value?.firstElementChild;
  if (!box) return;
  box.dispatchEvent(new TransitionEvent('transitionrun', {
    propertyName: 'border-top-width',
    pseudoElement: '::before'
  }));
}

onMounted(() => {
  let size = null;
  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (size?.width === width && size?.height === height) return;
    const isResize = size !== null;
    size = { width, height };
    if (!isResize) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(requestRedraw);
  });
  if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1, bowing: 1, seed: -9 }">
    <div ref="root">
      <RBox :tag="as" v-bind="$attrs" class="sketch-card">
        <slot />
      </RBox>
    </div>
  </RGraphicsConfig>
</template>
