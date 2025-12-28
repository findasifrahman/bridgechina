<template>
  <div class="space-y-6">
    <PageHeader title="Homepage Management" subtitle="Control featured content and homepage sections" />
    
    <!-- Offer Strip -->
    <Card>
      <CardHeader>
        <h3 class="text-lg font-semibold">Offer Strip</h3>
      </CardHeader>
      <CardBody>
        <div class="space-y-4">
          <Input
            v-model="offerStrip.title"
            label="Offer Text"
            placeholder="e.g., New: Guangzhou launch promo — airport pickup discount"
          />
          <Input
            v-model="offerStrip.link"
            label="Link URL"
            placeholder="/services/transport"
          />
          <Button variant="primary" @click="saveOfferStrip" :loading="saving">
            Save Offer Strip
          </Button>
        </div>
      </CardBody>
    </Card>

    <!-- Promo Cards -->
    <Card>
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Promo Cards</h3>
          <Button variant="primary" size="sm" @click="showPromoModal = true">Add Promo Card</Button>
        </div>
      </CardHeader>
      <CardBody>
        <div class="grid md:grid-cols-3 gap-4">
          <Card
            v-for="promo in promoCards"
            :key="promo.id"
            class="relative"
          >
            <CardBody class="p-4">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-semibold text-sm">{{ promo.title }}</h4>
                  <p v-if="promo.subtitle" class="text-xs text-slate-600">{{ promo.subtitle }}</p>
                </div>
                <Button variant="ghost" size="sm" @click="deletePromo(promo.id)">Delete</Button>
              </div>
              <div class="mt-2">
                <Badge v-if="promo.payload?.badge">{{ promo.payload.badge }}</Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      </CardBody>
    </Card>

    <!-- Featured Listings -->
    <Card>
      <CardHeader>
        <h3 class="text-lg font-semibold">Featured Items</h3>
      </CardHeader>
      <CardBody>
        <p class="text-sm text-slate-600 mb-4">Select items to feature on the homepage</p>
        <Tabs v-model="featuredTab" :tabs="featuredTabs" />
        <div v-if="featuredTab === 'hotels'" class="mt-4">
          <CompactTable
            :columns="hotelColumns"
            :data="hotels"
            @view="(row) => featuredItems.push({ type: 'hotel', id: row.id, name: row.name })"
          />
        </div>
      </CardBody>
    </Card>

    <!-- Promo Modal -->
    <Modal v-model="showPromoModal" title="Add Promo Card">
      <div class="space-y-4">
        <Input v-model="newPromo.title" label="Title" required />
        <Input v-model="newPromo.subtitle" label="Subtitle" />
        <Input v-model="newPromo.badge" label="Badge Text" />
        <Input v-model="newPromo.price" label="Price Text" />
        <Input v-model="newPromo.actionText" label="Button Text" />
        <Input v-model="newPromo.action" label="Action URL" />
        <div class="flex justify-end gap-3">
          <Button variant="ghost" @click="showPromoModal = false">Cancel</Button>
          <Button variant="primary" @click="savePromo" :loading="saving">Save</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Badge,
  Modal,
  Tabs,
  CompactTable,
} from '@bridgechina/ui';

const toast = useToast();
const offerStrip = ref({ title: '', link: '' });
const promoCards = ref<any[]>([]);
const featuredItems = ref<any[]>([]);
const hotels = ref<any[]>([]);
const showPromoModal = ref(false);
const saving = ref(false);
const featuredTab = ref('hotels');

const featuredTabs = [
  { value: 'hotels', label: 'Hotels' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'tours', label: 'Tours' },
  { value: 'esim', label: 'eSIM Plans' },
];

const hotelColumns = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'price_from', label: 'Price' },
];

const newPromo = ref({
  title: '',
  subtitle: '',
  badge: '',
  price: '',
  actionText: '',
  action: '',
});

async function loadHomepageData() {
  try {
    const [blocksRes, hotelsRes] = await Promise.all([
      axios.get('/api/admin/homepage/blocks'),
      axios.get('/api/admin/catalog/hotels'),
    ]);
    
    const blocks = blocksRes.data || [];
    blocks.forEach((block: any) => {
      if (block.type === 'offer_strip') {
        offerStrip.value = {
          title: block.title || '',
          link: block.payload?.link || '',
        };
      } else if (block.type === 'promo_card') {
        promoCards.value.push(block);
      }
    });
    
    hotels.value = hotelsRes.data || [];
  } catch (error) {
    console.error('Failed to load homepage data', error);
  }
}

async function saveOfferStrip() {
  saving.value = true;
  try {
    const existing = promoCards.value.find((b: any) => b.type === 'offer_strip');
    const payload = {
      type: 'offer_strip',
      title: offerStrip.value.title,
      payload: { link: offerStrip.value.link },
      is_active: true,
      sort_order: 1,
    };
    
    if (existing) {
      await axios.patch(`/api/admin/homepage/blocks/${existing.id}`, payload);
    } else {
      await axios.post('/api/admin/homepage/blocks', payload);
    }
    
    toast.success('Offer strip saved');
    await loadHomepageData();
  } catch (error) {
    toast.error('Failed to save offer strip');
  } finally {
    saving.value = false;
  }
}

async function savePromo() {
  saving.value = true;
  try {
    await axios.post('/api/admin/homepage/blocks', {
      type: 'promo_card',
      title: newPromo.value.title,
      subtitle: newPromo.value.subtitle,
      payload: {
        badge: newPromo.value.badge,
        price: newPromo.value.price,
        actionText: newPromo.value.actionText,
        action: newPromo.value.action,
      },
      is_active: true,
      sort_order: promoCards.value.length + 1,
    });
    
    toast.success('Promo card created');
    showPromoModal.value = false;
    newPromo.value = { title: '', subtitle: '', badge: '', price: '', actionText: '', action: '' };
    await loadHomepageData();
  } catch (error) {
    toast.error('Failed to create promo card');
  } finally {
    saving.value = false;
  }
}

async function deletePromo(id: string) {
  try {
    await axios.delete(`/api/admin/homepage/blocks/${id}`);
    toast.success('Promo card deleted');
    await loadHomepageData();
  } catch (error) {
    toast.error('Failed to delete promo card');
  }
}

onMounted(loadHomepageData);
</script>

