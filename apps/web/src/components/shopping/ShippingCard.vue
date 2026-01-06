<template>
  <div
    :class="[
      'bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden',
      isSticky ? 'sticky top-4' : '',
    ]"
  >
    <div class="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-amber-50">
      <div class="flex items-center gap-2">
        <Truck class="h-5 w-5 text-teal-600" />
        <h3 class="font-semibold text-slate-900">BridgeChina Shipping & Delivery</h3>
      </div>
    </div>

    <div class="p-4 space-y-4">
      <!-- Weight Display -->
      <div v-if="estimatedWeightKg !== null && estimatedWeightKg !== undefined" class="bg-slate-50 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-700">Estimated Weight:</span>
          <span class="text-sm font-semibold text-teal-600">{{ formatWeight(estimatedWeightKg) }} kg</span>
        </div>
        <div v-if="totalWeightKg > estimatedWeightKg" class="mt-2 text-xs text-slate-600">
          Total ({{ quantity }}x): {{ formatWeight(totalWeightKg) }} kg
        </div>
      </div>
      <div v-else class="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <div class="flex items-center gap-2">
          <AlertCircle class="h-4 w-4 text-amber-600" />
          <span class="text-sm text-amber-800">Weight unknown — agent will confirm</span>
        </div>
        <div class="mt-2">
          <Input
            v-model.number="manualWeight"
            type="number"
            step="0.1"
            min="0"
            placeholder="Enter estimated weight (kg)"
            class="text-sm"
            @input="handleManualWeight"
          />
        </div>
      </div>

      <!-- Shipping Method Selector -->
      <div v-if="shippingData" class="space-y-3">
        <label class="block text-sm font-semibold text-slate-700">Shipping Method</label>
        
        <div class="space-y-2">
          <label
            v-for="method in availableMethods"
            :key="method.code"
            :class="[
              'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
              selectedMethod === method.code
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 hover:border-teal-300 bg-white',
              !isMethodAvailable(method) ? 'opacity-50 cursor-not-allowed' : '',
            ]"
          >
            <input
              type="radio"
              :value="method.code"
              :checked="selectedMethod === method.code"
              :disabled="!isMethodAvailable(method)"
              @change="selectedMethod = method.code"
              class="mt-0.5"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-slate-900">{{ method.label }}</span>
                <Badge
                  v-if="isRecommendedTier(method)"
                  variant="success"
                  class="text-xs"
                >
                  Recommended
                </Badge>
              </div>
              <div class="text-xs text-slate-600 mt-1">
                <div v-if="method.ratePerKg">
                  {{ formatCurrency(method.ratePerKg) }}/kg
                  <span v-if="hasBattery && method.batteryRatePerKg">
                    ({{ formatCurrency(method.batteryRatePerKg) }}/kg with battery)
                  </span>
                </div>
                <div v-else-if="method.quoteRequired" class="text-amber-600">
                  Quote required
                </div>
                <div v-if="method.minKg !== undefined">
                  Min: {{ method.minKg }}kg
                </div>
              </div>
              <div v-if="!isMethodAvailable(method)" class="text-xs text-amber-600 mt-1">
                <span v-if="method.minKg !== undefined && billableWeightKg < method.minKg">
                  Requires {{ method.minKg }}kg minimum
                </span>
              </div>
            </div>
          </label>
        </div>

        <!-- Estimated Shipping Cost -->
        <div v-if="selectedMethodData && billableWeightKg > 0" class="bg-teal-50 rounded-lg p-3 border border-teal-200">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium text-slate-700">Estimated Shipping Cost:</span>
            <span class="text-lg font-bold text-teal-600">
              {{ formatCurrency(estimatedShippingCost) }}
            </span>
          </div>
          <div class="text-xs text-slate-600">
            <div>Billable weight: {{ formatWeight(billableWeightKg) }} kg (MOQ: {{ shippingData.moq_billable_kg }} kg)</div>
            <div v-if="selectedMethodData.ratePerKg">
              Rate: {{ formatCurrency(selectedMethodData.ratePerKg) }}/kg
            </div>
          </div>
        </div>

        <!-- Marketing Highlight -->
        <div v-if="shippingData.marketing && isRecommendedTier(selectedMethodData)" class="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div class="flex items-start gap-2">
            <Star class="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div class="text-xs text-amber-800">
              {{ shippingData.marketing.highlightText }}
            </div>
          </div>
        </div>

        <!-- Disclaimer Lines -->
        <div class="space-y-1 text-xs text-slate-600">
          <div v-for="(line, idx) in shippingData.disclaimerLines" :key="idx" class="flex items-start gap-2">
            <span class="text-slate-400">•</span>
            <span>{{ line }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Truck, AlertCircle, Star } from 'lucide-vue-next';
import { Input, Badge } from '@bridgechina/ui';

interface ShippingMethod {
  code: string;
  label: string;
  minKg?: number;
  maxKg?: number;
  ratePerKg?: number;
  batteryRatePerKg?: number;
  quoteRequired?: boolean;
}

interface ShippingData {
  currency: string;
  moq_billable_kg: number;
  methods: ShippingMethod[];
  marketing?: {
    highlightKg: number[];
    highlightText: string;
  };
  disclaimerLines: string[];
}

const props = defineProps<{
  shippingData?: ShippingData;
  estimatedWeightKg?: number | null;
  quantity?: number;
  hasBattery?: boolean;
  isSticky?: boolean;
  currency?: 'CNY' | 'BDT' | 'USD';
  conversionRates?: {
    CNY_TO_BDT?: number;
    CNY_TO_USD?: number;
  };
}>();

const emit = defineEmits<{
  (e: 'method-change', method: string): void;
  (e: 'weight-change', weight: number): void;
}>();

const selectedMethod = ref<string>('');
const manualWeight = ref<number | null>(null);

const totalWeightKg = computed(() => {
  const baseWeight = manualWeight.value ?? props.estimatedWeightKg ?? 0;
  return baseWeight * (props.quantity || 1);
});

const billableWeightKg = computed(() => {
  if (!props.shippingData) return 0;
  const weight = totalWeightKg.value;
  const moq = props.shippingData.moq_billable_kg;
  return Math.max(weight, moq);
});

const availableMethods = computed(() => {
  if (!props.shippingData) return [];
  return props.shippingData.methods;
});

const selectedMethodData = computed(() => {
  return availableMethods.value.find(m => m.code === selectedMethod.value);
});

const estimatedShippingCost = computed(() => {
  if (!selectedMethodData.value || billableWeightKg.value <= 0) return 0;
  
  const rate = props.hasBattery && selectedMethodData.value.batteryRatePerKg
    ? selectedMethodData.value.batteryRatePerKg
    : selectedMethodData.value.ratePerKg;
  
  if (!rate) return 0;
  
  return rate * billableWeightKg.value;
});

function isMethodAvailable(method: ShippingMethod): boolean {
  if (!method.minKg) return true;
  return billableWeightKg.value >= method.minKg;
}

function isRecommendedTier(method: ShippingMethod | undefined): boolean {
  if (!method || !props.shippingData?.marketing) return false;
  const weight = billableWeightKg.value;
  return props.shippingData.marketing.highlightKg.some(tier => 
    weight >= tier * 0.9 && weight <= tier * 1.1
  );
}

function formatWeight(kg: number): string {
  return kg.toFixed(2).replace(/\.?0+$/, '');
}

function formatCurrency(amount: number): string {
  if (!props.currency || props.currency === 'BDT') {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (props.currency === 'USD') {
    const usdAmount = props.conversionRates?.CNY_TO_USD 
      ? amount / props.conversionRates.CNY_TO_USD 
      : amount / 7.2; // Fallback rate
    return `$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // CNY
  return `¥${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function handleManualWeight() {
  if (manualWeight.value !== null && manualWeight.value > 0) {
    emit('weight-change', manualWeight.value);
  }
}

// Auto-select method based on weight
watch([totalWeightKg, availableMethods], () => {
  if (!props.shippingData) return;
  
  const weight = billableWeightKg.value;
  
  // Auto-select FAST_AIR if < 10kg
  if (weight < 10) {
    const fastAir = availableMethods.value.find(m => m.code === 'FAST_AIR');
    if (fastAir && isMethodAvailable(fastAir)) {
      selectedMethod.value = 'FAST_AIR';
      return;
    }
  }
  
  // Auto-select AIR if >= 10kg
  if (weight >= 10 && weight < 100) {
    const air = availableMethods.value.find(m => m.code === 'AIR');
    if (air && isMethodAvailable(air)) {
      selectedMethod.value = 'AIR';
      return;
    }
  }
  
  // Auto-select SEA if >= 100kg
  if (weight >= 100) {
    const sea = availableMethods.value.find(m => m.code === 'SEA');
    if (sea && isMethodAvailable(sea)) {
      selectedMethod.value = 'SEA';
      return;
    }
  }
}, { immediate: true });

watch(selectedMethod, (newMethod) => {
  emit('method-change', newMethod);
});
</script>

