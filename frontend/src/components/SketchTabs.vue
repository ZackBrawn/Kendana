<script setup>
import { nextTick, ref, watch } from 'vue';
import { RTabs, RTabItem, RGraphicsConfig } from 'roughness';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
  modelValue: {
    type: [String, Number],
    default: undefined
  },
  iconOnlyInactive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const root = ref(null);

function redrawAnchors() {
  root.value?.querySelectorAll('.r-tab-anchor').forEach((anchor) => {
    anchor.dispatchEvent(new TransitionEvent('transitionrun', {
      propertyName: 'border-top-width',
      pseudoElement: '::before'
    }));
  });
}

watch(() => props.modelValue, async () => {
  await nextTick();
  requestAnimationFrame(redrawAnchors);
});
</script>

<template>
  <RGraphicsConfig :options="{ roughness: 1.4, bowing: 1.2, seed: -7 }">
    <div ref="root" class="contents">
      <RTabs
        :model-value="modelValue"
        v-bind="$attrs"
        class="sketch-tabs"
        :class="{ 'sketch-tabs--icons': iconOnlyInactive }"
        @update:model-value="emit('update:modelValue', $event)"
      >
        <RTabItem v-for="tab in tabs" :key="tab.value" :value="tab.value">
          <template #anchor>
            <button type="button" class="r-tab-anchor__button sketch-tabs__button" :title="tab.label">
              <component :is="tab.icon" v-if="tab.icon" :size="15" class="shrink-0" />
              <span v-if="!iconOnlyInactive || tab.value === modelValue" class="whitespace-nowrap">{{ tab.label }}</span>
            </button>
          </template>
        </RTabItem>
      </RTabs>
    </div>
  </RGraphicsConfig>
</template>
