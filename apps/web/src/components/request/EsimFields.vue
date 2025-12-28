<template>
  <div class="space-y-4">
    <Select
      v-model="form.plan_id"
      label="Select eSIM Plan"
      :options="planOptions"
      required
      @update:model-value="loadPlanDetails"
    />
    <div v-if="selectedPlan" class="p-4 bg-slate-50 rounded-lg">
      <div class="flex justify-between items-start mb-2">
        <div>
          <p class="font-semibold text-slate-900">{{ selectedPlan.name }}</p>
          <p class="text-sm text-slate-600">{{ selectedPlan.provider }} • {{ selectedPlan.region_text }}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-teal-600">¥{{ selectedPlan.price }}</p>
          <p class="text-xs text-slate-500">{{ selectedPlan.validity_days }} days</p>
        </div>
      </div>
      <p class="text-sm text-slate-700">{{ selectedPlan.data_text }}</p>
    </div>
    <Input
      v-model="form.device_type"
      label="Device Type"
      placeholder="e.g., iPhone 14, Samsung Galaxy"
    />
    <Textarea
      v-model="form.notes"
      label="Additional Notes (Optional)"
      rows="3"
      placeholder="Any special requirements or questions..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Input, Select, Textarea } from '@bridgechina/ui';
import axios from '@/utils/axios';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const plans = ref<any[]>([]);
const selectedPlan = ref<any>(null);

const form = computed({
  get: () => props.modelValue || { plan_id: '', device_type: '', notes: '' },
  set: (val) => emit('update:modelValue', val),
});

const planOptions = computed(() =>
  plans.value.map((p) => ({
    value: p.id,
    label: `${p.name} - ¥${p.price} (${p.validity_days} days)`,
  }))
);

async function loadPlans() {
  try {
    const res = await axios.get('/api/public/catalog/esim');
    plans.value = res.data;
  } catch (error) {
    console.error('Failed to load eSIM plans', error);
  }
}

function loadPlanDetails(planId: string) {
  selectedPlan.value = plans.value.find((p) => p.id === planId) || null;
}

onMounted(() => {
  loadPlans();
  if (form.value.plan_id) {
    loadPlanDetails(form.value.plan_id);
  }
});
</script>

