<template>
  <Card :hover="true">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <div :class="iconBgClasses" class="rounded-lg p-3">
          <slot name="icon">
            <component v-if="icon" :is="icon" :class="iconClasses" class="h-6 w-6" />
          </slot>
        </div>
      </div>
      <div class="ml-4 w-0 flex-1">
        <dl>
          <dt class="text-sm font-medium text-slate-500 truncate">{{ label }}</dt>
          <dd class="flex items-baseline">
            <div class="text-2xl font-semibold text-slate-900">{{ value }}</div>
            <div v-if="change" :class="changeClasses" class="ml-2 flex items-baseline text-sm font-semibold">
              <component
                :is="change > 0 ? ArrowUp : ArrowDown"
                class="h-4 w-4 flex-shrink-0 self-center"
              />
              {{ Math.abs(change) }}%
            </div>
          </dd>
        </dl>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUp, ArrowDown } from 'lucide-vue-next';
import Card from './Card.vue';

interface Props {
  label: string;
  value: string | number;
  icon?: any;
  change?: number;
  iconColor?: 'teal' | 'amber' | 'blue' | 'green' | 'red';
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'teal',
  icon: undefined,
});

const iconBgClasses = computed(() => {
  const colors = {
    teal: 'bg-teal-100',
    amber: 'bg-amber-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    red: 'bg-red-100',
  };
  return colors[props.iconColor];
});

const iconClasses = computed(() => {
  const colors = {
    teal: 'text-teal-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };
  return colors[props.iconColor];
});

const changeClasses = computed(() => {
  return props.change && props.change > 0 ? 'text-green-600' : 'text-red-600';
});
</script>

