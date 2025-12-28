<template>
  <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              :class="column.sortable ? 'cursor-pointer hover:bg-slate-100' : ''"
              @click="column.sortable && $emit('sort', column.key)"
            >
              <div class="flex items-center space-x-1">
                <span>{{ column.label }}</span>
                <ChevronsUpDown v-if="column.sortable" class="h-3 w-3 text-slate-400" />
              </div>
            </th>
            <th v-if="actions" class="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr
            v-for="(row, idx) in data"
            :key="idx"
            class="hover:bg-slate-50 transition-colors"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-2 text-slate-700"
            >
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ row[column.key] }}
              </slot>
            </td>
            <td v-if="actions" class="px-4 py-2 text-right">
              <slot name="actions" :row="row">
                <div class="flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="$emit('view', row)">View</Button>
                  <Button variant="ghost" size="sm" @click="$emit('edit', row)">Edit</Button>
                </div>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="data.length === 0" class="p-8 text-center text-slate-500">
      <EmptyState title="No data" description="No items found" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronsUpDown } from 'lucide-vue-next';
import Button from './Button.vue';
import EmptyState from './EmptyState.vue';

defineProps<{
  columns: Array<{ key: string; label: string; sortable?: boolean }>;
  data: any[];
  actions?: boolean;
}>();

defineEmits<{
  sort: [key: string];
  view: [row: any];
  edit: [row: any];
}>();
</script>

