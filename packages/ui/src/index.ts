export { default as Button } from './components/Button.vue';
export { default as LinkButton } from './components/LinkButton.vue';
export { default as Card } from './components/Card.vue';
export { default as CardHeader } from './components/CardHeader.vue';
export { default as CardBody } from './components/CardBody.vue';
export { default as CompactCard } from './components/CompactCard.vue';
export { default as Badge } from './components/Badge.vue';
export { default as StatusChip } from './components/StatusChip.vue';
export { default as Input } from './components/Input.vue';
export { default as Select } from './components/Select.vue';
export { default as Textarea } from './components/Textarea.vue';
export { default as Checkbox } from './components/Checkbox.vue';
export { default as RadioGroup } from './components/RadioGroup.vue';
export { default as Modal } from './components/Modal.vue';
export { default as Drawer } from './components/Drawer.vue';
export { default as Tabs } from './components/Tabs.vue';
export { default as Table } from './components/Table.vue';
export { default as Pagination } from './components/Pagination.vue';
export { default as Toast } from './components/Toast.vue';
export { default as SkeletonLoader } from './components/SkeletonLoader.vue';
export { default as EmptyState } from './components/EmptyState.vue';
export { default as PageHeader } from './components/PageHeader.vue';
export { default as StatCard } from './components/StatCard.vue';
export { default as FormSection } from './components/FormSection.vue';
export { default as ConfirmDialog } from './components/ConfirmDialog.vue';
export { default as SidebarNav } from './components/SidebarNav.vue';
export { default as OfferStrip } from './components/OfferStrip.vue';
export { default as PromoCard } from './components/PromoCard.vue';
export { default as CompactTable } from './components/CompactTable.vue';
export { default as FilterBar } from './components/FilterBar.vue';
export { default as MediaPickerModal } from './components/MediaPickerModal.vue';
export { default as MultiImagePicker } from './components/MultiImagePicker.vue';
export { default as Carousel } from './components/Carousel.vue';
export { default as FloatingChatWidget } from './components/FloatingChatWidget.vue';
export { default as AiSearchBar } from './components/AiSearchBar.vue';
export { default as CrossSellWidget } from './components/CrossSellWidget.vue';
export { default as ImageCarousel } from './components/ImageCarousel.vue';

export { default as MarketingLayout } from './layouts/MarketingLayout.vue';
export { default as AppLayout } from './layouts/AppLayout.vue';
export { default as AdminLayout } from './layouts/AdminLayout.vue';
export { default as SellerLayout } from './layouts/SellerLayout.vue';

export { useToast } from './composables/useToast';

// Vue plugin for global registration (optional)
import type { App } from 'vue';
import Button from './components/Button.vue';
import Card from './components/Card.vue';
import Input from './components/Input.vue';
import Badge from './components/Badge.vue';

export function install(app: App) {
  app.component('BridgeButton', Button);
  app.component('BridgeCard', Card);
  app.component('BridgeInput', Input);
  app.component('BridgeBadge', Badge);
}

