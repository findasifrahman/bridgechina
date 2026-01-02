<template>
  <div>
    <PageHeader title="Catalog Management">
      <template #actions>
        <Button variant="primary" @click="activeTab = 'cities'">Cities</Button>
        <Button variant="primary" @click="activeTab = 'hotels'">Hotels</Button>
        <Button variant="primary" @click="activeTab = 'restaurants'">Restaurants</Button>
      </template>
    </PageHeader>

    <Tabs v-model="activeTab" :tabs="tabs" />
    
    <!-- Cities -->
    <Card v-if="activeTab === 'cities'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Cities</h3>
          <Button variant="primary" size="sm" @click="openCityModal()">Add City</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleCitySearch" />
        <CompactTable
          :columns="cityColumns"
          :data="filteredCities"
          :actions="true"
          @edit="openCityModal"
          @view="openCityModal"
        >
          <template #cell-status="{ row }">
            <Badge :variant="row.is_active ? 'success' : 'default'">
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openCityModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteCity(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Hotels -->
    <Card v-if="activeTab === 'hotels'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Internal Hotels</h3>
          <Button variant="primary" size="sm" @click="openHotelModal()">Add Hotel</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleHotelSearch" />
        <CompactTable
          :columns="hotelColumns"
          :data="filteredHotels"
          :actions="true"
          @edit="openHotelModal"
          @view="openHotelModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-price="{ row }">
            ¥{{ row.price_from || 'N/A' }}
          </template>
          <template #cell-verified="{ row }">
            <Badge :variant="row.verified ? 'success' : 'default'">
              {{ row.verified ? 'Verified' : 'Unverified' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openHotelModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteHotel(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- External Hotels (Booking.com) -->
    <Card v-if="activeTab === 'hotels'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">External Hotels (Booking.com)</h3>
          <Badge variant="info">Read-only</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleExternalHotelSearch" />
        <CompactTable
          :columns="externalHotelColumns"
          :data="filteredExternalHotels"
          :actions="false"
        >
          <template #cell-city="{ row }">
            {{ row.city || 'N/A' }}
          </template>
          <template #cell-price="{ row }">
            {{ row.currency || 'CNY' }}{{ row.gross_price || 'N/A' }}
          </template>
          <template #cell-rating="{ row }">
            <div class="flex items-center gap-1">
              <span v-if="row.review_score">{{ row.review_score.toFixed(1) }}</span>
              <span v-else class="text-slate-400">N/A</span>
              <span v-if="row.review_count" class="text-sm text-slate-500">({{ row.review_count }})</span>
            </div>
          </template>
          <template #cell-synced="{ row }">
            <span class="text-xs text-slate-600">{{ row.last_synced_at ? new Date(row.last_synced_at).toLocaleDateString() : 'Never' }}</span>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- External Hotel Cache -->
    <Card v-if="activeTab === 'hotels'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">External Hotel Search Cache</h3>
          <Button variant="secondary" size="sm" @click="refreshCache" :loading="refreshingCache">Refresh Cache</Button>
        </div>
      </CardHeader>
      <CardBody>
        <CompactTable
          :columns="cacheColumns"
          :data="externalHotelCache"
          :actions="false"
        >
          <template #cell-dest_id="{ row }">
            <code class="text-xs">{{ row.dest_id }}</code>
          </template>
          <template #cell-hotels="{ row }">
            <span>{{ Array.isArray(row.hotel_ids) ? row.hotel_ids.length : 0 }} hotels</span>
          </template>
          <template #cell-created="{ row }">
            <span class="text-xs text-slate-600">{{ new Date(row.created_at).toLocaleString() }}</span>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Restaurants -->
    <Card v-if="activeTab === 'restaurants'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Restaurants</h3>
          <Button variant="primary" size="sm" @click="openRestaurantModal()">Add Restaurant</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleRestaurantSearch" />
        <CompactTable
          :columns="restaurantColumns"
          :data="filteredRestaurants"
          :actions="true"
          @edit="openRestaurantModal"
          @view="openRestaurantModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-halal="{ row }">
            <Badge :variant="row.halal_verified ? 'success' : 'default'">
              {{ row.halal_verified ? 'Halal Verified' : 'Not Verified' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openRestaurantModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteRestaurant(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Medical Centers -->
    <Card v-if="activeTab === 'medical'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Medical Centers</h3>
          <Button variant="primary" size="sm" @click="openMedicalModal()">Add Medical Center</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleMedicalSearch" />
        <CompactTable
          :columns="medicalColumns"
          :data="filteredMedical"
          :actions="true"
          @edit="openMedicalModal"
          @view="openMedicalModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-type="{ row }">
            <Badge>{{ row.type }}</Badge>
          </template>
          <template #cell-verified="{ row }">
            <Badge :variant="row.verified ? 'success' : 'default'">
              {{ row.verified ? 'Verified' : 'Unverified' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openMedicalModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteMedical(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Tours -->
    <Card v-if="activeTab === 'tours'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Tours</h3>
          <Button variant="primary" size="sm" @click="openTourModal()">Add Tour</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleTourSearch" />
        <CompactTable
          :columns="tourColumns"
          :data="filteredTours"
          :actions="true"
          @edit="openTourModal"
          @view="openTourModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-price="{ row }">
            ¥{{ row.price_from || 'N/A' }}
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openTourModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteTour(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Transport Products -->
    <Card v-if="activeTab === 'transport'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Transport Products</h3>
          <Button variant="primary" size="sm" @click="openTransportModal()">Add Transport</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleTransportSearch" />
        <CompactTable
          :columns="transportColumns"
          :data="filteredTransport"
          :actions="true"
          @edit="openTransportModal"
          @view="openTransportModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-type="{ row }">
            <Badge>{{ row.type }}</Badge>
          </template>
          <template #cell-price="{ row }">
            ¥{{ row.base_price }}
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openTransportModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteTransport(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Guides -->
    <Card v-if="activeTab === 'guides'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Guides</h3>
          <Button variant="primary" size="sm" @click="openGuideModal()">Add Guide</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleGuideSearch" />
        <CompactTable
          :columns="guideColumns"
          :data="filteredGuides"
          :actions="true"
          @edit="openGuideModal"
          @view="openGuideModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-rating="{ row }">
            <div class="flex items-center gap-1">
              <span v-if="row.rating">{{ row.rating.toFixed(1) }}</span>
              <span v-else class="text-slate-400">N/A</span>
              <span v-if="row.review_count" class="text-sm text-slate-500">({{ row.review_count }})</span>
            </div>
          </template>
          <template #cell-verified="{ row }">
            <Badge :variant="row.verified ? 'success' : 'default'">
              {{ row.verified ? 'Verified' : 'Unverified' }}
            </Badge>
          </template>
          <template #cell-hourly_rate="{ row }">
            <span v-if="row.hourly_rate">¥{{ row.hourly_rate }}/hr</span>
            <span v-else class="text-slate-400">N/A</span>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openGuideModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteGuide(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- eSIM Plans -->
    <Card v-if="activeTab === 'esim'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">eSIM Plans</h3>
          <Button variant="primary" size="sm" @click="openEsimModal()">Add eSIM Plan</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleEsimSearch" />
        <CompactTable
          :columns="esimColumns"
          :data="filteredEsim"
          :actions="true"
          :pagination="esimPagination"
          @edit="openEsimModal"
          @view="openEsimModal"
          @page-change="handleEsimPageChange"
        >
          <template #cell-price="{ row }">
            {{ row.currency }} {{ row.price }}
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="row.is_active ? 'success' : 'default'">
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openEsimModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteEsim(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- City Places -->
    <Card v-if="activeTab === 'cityplaces'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">City Places</h3>
          <Button variant="primary" size="sm" @click="openCityplaceModal()">Add City Place</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleCityplaceSearch" />
        <CompactTable
          :columns="cityplaceColumns"
          :data="filteredCityplaces"
          :actions="true"
          @edit="openCityplaceModal"
          @view="openCityplaceModal"
        >
          <template #cell-city="{ row }">
            {{ row.city?.name || 'N/A' }}
          </template>
          <template #cell-rating="{ row }">
            <div class="flex items-center gap-1">
              <span v-if="row.star_rating">{{ row.star_rating.toFixed(1) }}</span>
              <span v-else class="text-slate-400">N/A</span>
              <span v-if="row.review_count" class="text-sm text-slate-500">({{ row.review_count }})</span>
            </div>
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="row.is_active ? 'success' : 'default'">
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openCityplaceModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteCityplace(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- City Modal -->
    <Modal v-model="showCityModal" :title="editingCity ? 'Edit City' : 'Add City'" size="lg">
      <form @submit.prevent="saveCity" class="space-y-4">
        <Input v-model="cityForm.name" label="Name" required />
        <Input v-model="cityForm.slug" label="Slug" required />
        <Input v-model="cityForm.country" label="Country" />
        <Textarea v-model="cityForm.description" label="Description" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Highlights (comma-separated)</label>
          <Input v-model="cityForm.highlightsText" placeholder="Tourist attractions, landmarks, etc." />
        </div>
        <MultiImagePicker
          v-model="cityForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex items-center space-x-2">
          <Checkbox v-model="cityForm.is_active" label="Active" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showCityModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Hotel Modal -->
    <Modal v-model="showHotelModal" :title="editingHotel ? 'Edit Hotel' : 'Add Hotel'" size="xl">
      <form @submit.prevent="saveHotel" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="hotelForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
          <Input v-model="hotelForm.name" label="Name" required />
        </div>
        <Input v-model="hotelForm.address" label="Address" required />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="hotelForm.geo_lat" label="Latitude" type="number" step="any" />
          <Input v-model.number="hotelForm.geo_lng" label="Longitude" type="number" step="any" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="hotelForm.price_from" label="Price From" type="number" step="0.01" />
          <Input v-model.number="hotelForm.price_to" label="Price To" type="number" step="0.01" />
          <Select
            v-model="hotelForm.currency"
            label="Currency"
            :options="[{ value: 'CNY', label: 'CNY' }, { value: 'USD', label: 'USD' }]"
          />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="hotelForm.rating" label="Rating (0-5)" type="number" step="0.1" min="0" max="5" />
          <Input v-model.number="hotelForm.review_count" label="Review Count" type="number" />
          <Input v-model.number="hotelForm.star_rating" label="Star Rating (1-5)" type="number" min="1" max="5" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="hotelForm.checkin_time" label="Check-in Time" placeholder="14:00" />
          <Input v-model="hotelForm.checkout_time" label="Check-out Time" placeholder="12:00" />
        </div>
        <Input v-model="hotelForm.contact_phone" label="Contact Phone" />
        <Input v-model="hotelForm.contact_email" label="Contact Email" type="email" />
        <Input v-model="hotelForm.website" label="Website" />
        <Textarea v-model="hotelForm.description" label="Description" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Amenities (comma-separated)</label>
          <Input v-model="hotelForm.amenitiesText" placeholder="WiFi, Pool, Gym, Parking" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Facilities (comma-separated)</label>
          <Input v-model="hotelForm.facilitiesText" placeholder="Restaurant, Spa, Business Center" />
        </div>
        <MultiImagePicker
          v-model="hotelForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex items-center space-x-2">
          <Checkbox v-model="hotelForm.verified" label="Verified" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showHotelModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Restaurant Modal -->
    <Modal v-model="showRestaurantModal" :title="editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'" size="xl">
      <form @submit.prevent="saveRestaurant" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="restaurantForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
          <Input v-model="restaurantForm.name" label="Name" required />
        </div>
        <Input v-model="restaurantForm.address" label="Address" required />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="restaurantForm.geo_lat" label="Latitude" type="number" step="any" />
          <Input v-model.number="restaurantForm.geo_lng" label="Longitude" type="number" step="any" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="restaurantForm.rating" label="Rating (0-5)" type="number" step="0.1" min="0" max="5" />
          <Input v-model.number="restaurantForm.review_count" label="Review Count" type="number" />
          <Input v-model="restaurantForm.cuisine_type" label="Cuisine Type" placeholder="Chinese, Halal, etc." />
        </div>
        <Input v-model="restaurantForm.price_range" label="Price Range" placeholder="¥¥ or $-$" />
        <Input v-model="restaurantForm.opening_hours" label="Opening Hours" placeholder='{"mon": "09:00-22:00"}' />
        <Input v-model="restaurantForm.contact_phone" label="Contact Phone" />
        <Input v-model="restaurantForm.contact_email" label="Contact Email" type="email" />
        <Input v-model="restaurantForm.website" label="Website" />
        <Textarea v-model="restaurantForm.description" label="Description" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Specialties (comma-separated)</label>
          <Input v-model="restaurantForm.specialtiesText" placeholder="Biriyani, Naan, Curry" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Amenities (comma-separated)</label>
          <Input v-model="restaurantForm.amenitiesText" placeholder="WiFi, Parking, Delivery" />
        </div>
        <MultiImagePicker
          v-model="restaurantForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex items-center space-x-4">
          <Checkbox v-model="restaurantForm.halal_verified" label="Halal Verified" />
          <Checkbox v-model="restaurantForm.delivery_supported" label="Delivery Supported" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showRestaurantModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Medical Modal -->
    <Modal v-model="showMedicalModal" :title="editingMedical ? 'Edit Medical Center' : 'Add Medical Center'" size="xl">
      <form @submit.prevent="saveMedical" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="medicalForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
          <Input v-model="medicalForm.name" label="Name" required />
        </div>
        <Select
          v-model="medicalForm.type"
          label="Type"
          :options="[{ value: 'hospital', label: 'Hospital' }, { value: 'clinic', label: 'Clinic' }, { value: 'pharmacy', label: 'Pharmacy' }]"
          required
        />
        <Input v-model="medicalForm.address" label="Address" required />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="medicalForm.geo_lat" label="Latitude" type="number" step="any" />
          <Input v-model.number="medicalForm.geo_lng" label="Longitude" type="number" step="any" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="medicalForm.rating" label="Rating (0-5)" type="number" step="0.1" min="0" max="5" />
          <Input v-model.number="medicalForm.review_count" label="Review Count" type="number" />
          <Input v-model="medicalForm.opening_hours" label="Opening Hours" placeholder='{"mon": "09:00-18:00"}' />
        </div>
        <Input v-model="medicalForm.contact_phone" label="Contact Phone" />
        <Input v-model="medicalForm.contact_email" label="Contact Email" type="email" />
        <Input v-model="medicalForm.website" label="Website" />
        <Textarea v-model="medicalForm.description" label="Description" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Specialties (comma-separated)</label>
          <Input v-model="medicalForm.specialtiesText" placeholder="Cardiology, Emergency, Pediatrics" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Services (comma-separated)</label>
          <Input v-model="medicalForm.servicesText" placeholder="Consultation, Lab Tests, X-Ray" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Languages (comma-separated)</label>
          <Input v-model="medicalForm.languagesText" placeholder="English, Chinese, Arabic" />
        </div>
        <MultiImagePicker
          v-model="medicalForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex items-center space-x-4">
          <Checkbox v-model="medicalForm.verified" label="Verified" />
          <Checkbox v-model="medicalForm.emergency_available" label="Emergency Available" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showMedicalModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Tour Modal -->
    <Modal v-model="showTourModal" :title="editingTour ? 'Edit Tour' : 'Add Tour'" size="xl">
      <form @submit.prevent="saveTour" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="tourForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
          <Input v-model="tourForm.name" label="Name" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="tourForm.duration_text" label="Duration Text" placeholder="Full Day" />
          <Input v-model.number="tourForm.duration_hours" label="Duration (Hours)" type="number" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="tourForm.price_from" label="Price From" type="number" step="0.01" />
          <Input v-model.number="tourForm.price_to" label="Price To" type="number" step="0.01" />
          <Select
            v-model="tourForm.currency"
            label="Currency"
            :options="[{ value: 'CNY', label: 'CNY' }, { value: 'USD', label: 'USD' }]"
          />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="tourForm.rating" label="Rating (0-5)" type="number" step="0.1" min="0" max="5" />
          <Input v-model.number="tourForm.review_count" label="Review Count" type="number" />
          <Input v-model="tourForm.meeting_point" label="Meeting Point" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="tourForm.min_group_size" label="Min Group Size" type="number" />
          <Input v-model.number="tourForm.max_group_size" label="Max Group Size" type="number" />
        </div>
        <Textarea v-model="tourForm.description" label="Description" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Highlights (comma-separated)</label>
          <Input v-model="tourForm.highlightsText" placeholder="Great Wall, Forbidden City, Temple" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Inclusions (comma-separated)</label>
          <Input v-model="tourForm.inclusionsText" placeholder="Transport, Guide, Meals" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Exclusions (comma-separated)</label>
          <Input v-model="tourForm.exclusionsText" placeholder="Personal expenses, Tips" />
        </div>
        <Input v-model="tourForm.cancellation_policy" label="Cancellation Policy" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Languages (comma-separated)</label>
          <Input v-model="tourForm.languagesText" placeholder="English, Chinese, Arabic" />
        </div>
        <MultiImagePicker
          v-model="tourForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showTourModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Transport Modal -->
    <Modal v-model="showTransportModal" :title="editingTransport ? 'Edit Transport Product' : 'Add Transport Product'" size="xl">
      <form @submit.prevent="saveTransport" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="transportForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
          <Input v-model="transportForm.name" label="Name" required />
        </div>
        <Select
          v-model="transportForm.type"
          label="Type"
          :options="[
            { value: 'pickup', label: 'Airport Pickup' },
            { value: 'point_to_point', label: 'Point to Point' },
            { value: 'daily_charter', label: 'Daily Charter' }
          ]"
          required
        />
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="transportForm.vehicle_type"
            label="Vehicle Type"
            :options="[
              { value: 'sedan', label: 'Sedan' },
              { value: 'suv', label: 'SUV' },
              { value: 'van', label: 'Van' },
              { value: 'bus', label: 'Bus' }
            ]"
          />
          <Input v-model.number="transportForm.capacity" label="Capacity (seats)" type="number" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Input v-model.number="transportForm.base_price" label="Base Price" type="number" step="0.01" required />
          <Input v-model.number="transportForm.price_per_km" label="Price Per KM" type="number" step="0.01" />
          <Select
            v-model="transportForm.currency"
            label="Currency"
            :options="[{ value: 'CNY', label: 'CNY' }, { value: 'USD', label: 'USD' }]"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="transportForm.rating" label="Rating (0-5)" type="number" step="0.1" min="0" max="5" />
          <Input v-model.number="transportForm.review_count" label="Review Count" type="number" />
        </div>
        <Textarea v-model="transportForm.description" label="Description" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Features (comma-separated)</label>
          <Input v-model="transportForm.featuresText" placeholder="WiFi, AC, GPS, English Driver" />
        </div>
        <MultiImagePicker
          v-model="transportForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showTransportModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- City Place Modal -->
    <Modal v-model="showCityplaceModal" :title="editingCityplace ? 'Edit City Place' : 'Add City Place'" size="xl">
      <form @submit.prevent="saveCityplace" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="cityplaceForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
          <Input v-model="cityplaceForm.name" label="Name" required />
        </div>
        <Input v-model="cityplaceForm.slug" label="Slug" required />
        <Input v-model="cityplaceForm.address" label="Address" required />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="cityplaceForm.geo_lat" label="Latitude" type="number" step="any" />
          <Input v-model.number="cityplaceForm.geo_lng" label="Longitude" type="number" step="any" />
        </div>
        <Input v-model="cityplaceForm.short_description" label="Short Description" />
        <Textarea v-model="cityplaceForm.description" label="Description" />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="cityplaceForm.cost_range" label="Cost Range" placeholder="¥¥ or $-$$$" />
          <Input v-model="cityplaceForm.customer_support_phone" label="Customer Support Phone" />
        </div>
        <Input v-model="cityplaceForm.opening_hours" label="Opening Hours (JSON)" placeholder='{"mon": "09:00-18:00"}' />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Linked Tours (select multiple)</label>
          <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2">
            <label
              v-for="tour in tours"
              :key="tour.id"
              class="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
            >
              <input
                type="checkbox"
                :value="tour.id"
                v-model="cityplaceForm.tour_ids"
                class="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span class="text-sm">{{ tour.name }}</span>
            </label>
            <p v-if="tours.length === 0" class="text-sm text-slate-400 p-2">No tours available</p>
          </div>
        </div>
        <MultiImagePicker
          v-model="cityplaceForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex items-center space-x-4">
          <Checkbox v-model="cityplaceForm.is_family_friendly" label="Family Friendly" />
          <Checkbox v-model="cityplaceForm.is_pet_friendly" label="Pet Friendly" />
          <Checkbox v-model="cityplaceForm.is_active" label="Active" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showCityplaceModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Guide Modal -->
    <Modal v-model="showGuideModal" :title="editingGuide ? 'Edit Guide' : 'Add Guide'" size="xl">
      <form @submit.prevent="saveGuide" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="guideForm.user_id"
            label="User (Optional)"
            :options="[{ value: '', label: 'No user (unclaimed profile)' }, ...userOptions]"
            :disabled="!!editingGuide"
            placeholder="Select a user (optional)"
          />
          <Select
            v-model="guideForm.city_id"
            label="City"
            :options="cityOptions"
            required
          />
        </div>
        <Input v-model="guideForm.display_name" label="Display Name" required />
        <Textarea v-model="guideForm.bio" label="Bio" />
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Languages (comma-separated)</label>
          <Input v-model="guideForm.languagesText" placeholder="English, Chinese, Bangla" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input 
            :model-value="guideForm.hourly_rate ?? ''"
            @update:model-value="guideForm.hourly_rate = $event === '' ? undefined : ($event ? Number($event) : undefined)"
            label="Hourly Rate (CNY)" 
            type="number" 
            step="0.01"
          />
          <Input 
            :model-value="guideForm.daily_rate ?? ''"
            @update:model-value="guideForm.daily_rate = $event === '' ? undefined : ($event ? Number($event) : undefined)"
            label="Daily Rate (CNY)" 
            type="number" 
            step="0.01"
          />
        </div>
        <MultiImagePicker
          v-model="guideForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex items-center space-x-2">
          <Checkbox v-model="guideForm.verified" label="Verified" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showGuideModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- eSIM Modal -->
    <Modal v-model="showEsimModal" :title="editingEsim ? 'Edit eSIM Plan' : 'Add eSIM Plan'" size="xl">
      <form @submit.prevent="saveEsim" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="esimForm.name" label="Name" required />
          <Input v-model="esimForm.package_code" label="Package Code" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="esimForm.provider" label="Provider" required />
          <Input v-model="esimForm.country" label="Country" />
        </div>
        <Input v-model="esimForm.region_text" label="Region Text" required />
        <Select
          v-model="esimForm.package_type"
          :options="[
            { value: 'single_country', label: 'Single Country' },
            { value: 'multi_country', label: 'Multi Country' },
            { value: 'regional', label: 'Regional' },
          ]"
          label="Package Type"
        />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="esimForm.data_text" label="Data Text (e.g., 2GB/Day)" required />
          <Input v-model.number="esimForm.data_amount_gb" label="Data Amount (GB)" type="number" step="0.1" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="esimForm.data_period" label="Data Period" />
          <Input v-model.number="esimForm.validity_days" label="Validity (Days)" type="number" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="esimForm.price" label="Price" type="number" step="0.01" required />
          <Select
            v-model="esimForm.currency"
            :options="[{ value: 'USD', label: 'USD' }, { value: 'CNY', label: 'CNY' }]"
            label="Currency"
          />
        </div>
        <Input v-model="esimForm.data_speed" label="Data Speed (e.g., 3G/4G/5G)" />
        <Textarea v-model="esimForm.description" label="Description" />
        <div class="grid grid-cols-3 gap-4">
          <div class="flex items-center space-x-2">
            <Checkbox v-model="esimForm.is_active" label="Active" />
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox v-model="esimForm.sms_enabled" label="SMS Enabled" />
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox v-model="esimForm.number_available" label="Number Available" />
          </div>
        </div>
        <MultiImagePicker
          v-model="esimForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showEsimModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Food Categories -->
    <Card v-if="activeTab === 'food-categories'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Food Categories</h3>
          <Button variant="primary" size="sm" @click="openFoodCategoryModal()">Add Category</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleFoodCategorySearch" />
        <CompactTable
          :columns="foodCategoryColumns"
          :data="filteredFoodCategories"
          :actions="true"
          :pagination="foodCategoryPagination"
          @edit="openFoodCategoryModal"
          @view="openFoodCategoryModal"
          @page-change="handleFoodCategoryPageChange"
        >
          <template #cell-status="{ row }">
            <Badge :variant="row.is_active ? 'success' : 'default'">
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openFoodCategoryModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteFoodCategory(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Food Items -->
    <Card v-if="activeTab === 'food-items'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Food Items</h3>
          <Button variant="primary" size="sm" @click="openFoodItemModal()">Add Food Item</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleFoodItemSearch" />
        <CompactTable
          :columns="foodItemColumns"
          :data="filteredFoodItems"
          :actions="true"
          :pagination="foodItemPagination"
          @edit="openFoodItemModal"
          @view="openFoodItemModal"
          @page-change="handleFoodItemPageChange"
        >
          <template #cell-restaurant="{ row }">
            {{ row.restaurant?.name || 'N/A' }}
          </template>
          <template #cell-category="{ row }">
            {{ row.category?.name || 'N/A' }}
          </template>
          <template #cell-price="{ row }">
            {{ row.currency }} {{ row.price }}
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="row.is_available ? 'success' : 'default'">
              {{ row.is_available ? 'Available' : 'Unavailable' }}
            </Badge>
          </template>
          <template #cell-halal="{ row }">
            <Badge :variant="row.is_halal ? 'success' : 'default'">
              {{ row.is_halal ? 'Halal' : 'Non-Halal' }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openFoodItemModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteFoodItem(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Food Category Modal -->
    <Modal v-model="showFoodCategoryModal" :title="editingFoodCategory ? 'Edit Food Category' : 'Add Food Category'" size="lg">
      <form @submit.prevent="saveFoodCategory" class="space-y-4">
        <Input v-model="foodCategoryForm.name" label="Name" required />
        <Input v-model="foodCategoryForm.name_cn" label="Chinese Name" />
        <Textarea v-model="foodCategoryForm.description" label="Description" />
        <Input v-model="foodCategoryForm.icon" label="Icon (emoji or icon name)" />
        <Input v-model.number="foodCategoryForm.sort_order" label="Sort Order" type="number" />
        <div class="flex items-center space-x-2">
          <Checkbox v-model="foodCategoryForm.is_active" label="Active" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showFoodCategoryModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Food Item Modal -->
    <Modal v-model="showFoodItemModal" :title="editingFoodItem ? 'Edit Food Item' : 'Add Food Item'" size="lg">
      <form @submit.prevent="saveFoodItem" class="space-y-4">
        <Select
          v-model="foodItemForm.restaurant_id"
          :options="restaurantOptions"
          label="Restaurant"
          required
        />
        <Select
          v-model="foodItemForm.category_id"
          :options="foodCategoryOptions"
          label="Category"
        />
        <Input v-model="foodItemForm.name" label="Name" required />
        <Input v-model="foodItemForm.name_cn" label="Chinese Name" />
        <Textarea v-model="foodItemForm.description" label="Description" />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="foodItemForm.price" label="Price" type="number" step="0.01" required />
          <Select
            v-model="foodItemForm.currency"
            :options="[{ value: 'CNY', label: 'CNY' }, { value: 'USD', label: 'USD' }]"
            label="Currency"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="foodItemForm.spicy_level" label="Spicy Level (0-5)" type="number" min="0" max="5" />
          <Input v-model.number="foodItemForm.preparation_time" label="Preparation Time (minutes)" type="number" />
        </div>
        <Input v-model="foodItemForm.serving_size" label="Serving Size" />
        <div class="grid grid-cols-3 gap-4">
          <div class="flex items-center space-x-2">
            <Checkbox v-model="foodItemForm.is_available" label="Available" />
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox v-model="foodItemForm.is_vegetarian" label="Vegetarian" />
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox v-model="foodItemForm.is_vegan" label="Vegan" />
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <Checkbox v-model="foodItemForm.is_halal" label="Halal" />
        </div>
        <MultiImagePicker
          v-model="foodItemForm.image_ids"
          :available-assets="mediaAssets"
        />
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showFoodItemModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Tabs,
  CompactTable,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  Checkbox,
  FilterBar,
  ConfirmDialog,
  MultiImagePicker,
} from '@bridgechina/ui';

const toast = useToast();

const activeTab = ref('cities');
const cities = ref<any[]>([]);
const hotels = ref<any[]>([]);
const externalHotels = ref<any[]>([]);
const externalHotelCache = ref<any[]>([]);
const restaurants = ref<any[]>([]);
const medical = ref<any[]>([]);
const tours = ref<any[]>([]);
const transport = ref<any[]>([]);
const cityplaces = ref<any[]>([]);
const guides = ref<any[]>([]);
const esim = ref<any[]>([]);
const foodCategories = ref<any[]>([]);
const foodItems = ref<any[]>([]);
const mediaAssets = ref<any[]>([]);
const users = ref<any[]>([]);

const citySearch = ref('');
const hotelSearch = ref('');
const externalHotelSearch = ref('');
const restaurantSearch = ref('');
const refreshingCache = ref(false);
const medicalSearch = ref('');
const tourSearch = ref('');
const transportSearch = ref('');
const cityplaceSearch = ref('');
const guideSearch = ref('');
const esimSearch = ref('');
const foodCategorySearch = ref('');
const foodItemSearch = ref('');

// Pagination
const esimPagination = ref({ page: 1, limit: 50, total: 0, totalPages: 0 });
const foodCategoryPagination = ref({ page: 1, limit: 50, total: 0, totalPages: 0 });
const foodItemPagination = ref({ page: 1, limit: 50, total: 0, totalPages: 0 });

const filteredCities = computed(() => {
  if (!citySearch.value) return cities.value;
  const q = citySearch.value.toLowerCase();
  return cities.value.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.slug.toLowerCase().includes(q)
  );
});

const filteredHotels = computed(() => {
  if (!hotelSearch.value) return hotels.value;
  const q = hotelSearch.value.toLowerCase();
  return hotels.value.filter(h => 
    h.name.toLowerCase().includes(q) || 
    h.city?.name.toLowerCase().includes(q) ||
    h.address.toLowerCase().includes(q)
  );
});

const filteredExternalHotels = computed(() => {
  if (!externalHotelSearch.value) return externalHotels.value;
  const q = externalHotelSearch.value.toLowerCase();
  return externalHotels.value.filter(h => 
    h.name?.toLowerCase().includes(q) || 
    h.city?.toLowerCase().includes(q) ||
    h.address?.toLowerCase().includes(q)
  );
});

const filteredRestaurants = computed(() => {
  if (!restaurantSearch.value) return restaurants.value;
  const q = restaurantSearch.value.toLowerCase();
  return restaurants.value.filter(r => 
    r.name.toLowerCase().includes(q) || 
    r.city?.name.toLowerCase().includes(q) ||
    r.address.toLowerCase().includes(q)
  );
});

const filteredMedical = computed(() => {
  if (!medicalSearch.value) return medical.value;
  const q = medicalSearch.value.toLowerCase();
  return medical.value.filter(m => 
    m.name.toLowerCase().includes(q) || 
    m.city?.name.toLowerCase().includes(q) ||
    m.address.toLowerCase().includes(q)
  );
});

const filteredTours = computed(() => {
  if (!tourSearch.value) return tours.value;
  const q = tourSearch.value.toLowerCase();
  return tours.value.filter(t => 
    t.name.toLowerCase().includes(q) || 
    t.city?.name.toLowerCase().includes(q)
  );
});

const filteredTransport = computed(() => {
  if (!transportSearch.value) return transport.value;
  const q = transportSearch.value.toLowerCase();
  return transport.value.filter(t => 
    t.type.toLowerCase().includes(q) || 
    t.city?.name.toLowerCase().includes(q)
  );
});

const filteredCityplaces = computed(() => {
  if (!cityplaceSearch.value) return cityplaces.value;
  const q = cityplaceSearch.value.toLowerCase();
  return cityplaces.value.filter(cp => 
    cp.name.toLowerCase().includes(q) || 
    cp.city?.name.toLowerCase().includes(q) ||
    cp.address.toLowerCase().includes(q)
  );
});

const filteredGuides = computed(() => {
  if (!guideSearch.value) return guides.value;
  const q = guideSearch.value.toLowerCase();
  return guides.value.filter(g => 
    g.display_name.toLowerCase().includes(q) || 
    g.city?.name.toLowerCase().includes(q) ||
    g.bio?.toLowerCase().includes(q)
  );
});

const filteredEsim = computed(() => esim.value);
const filteredFoodCategories = computed(() => foodCategories.value);
const filteredFoodItems = computed(() => foodItems.value);

const foodCategoryOptions = computed(() => [
  { value: '', label: 'No Category' },
  ...foodCategories.value.map(c => ({ value: c.id, label: `${c.name}${c.name_cn ? ` (${c.name_cn})` : ''}` })),
]);

const cityOptions = computed(() => 
  cities.value.map(c => ({ value: c.id, label: c.name }))
);

const restaurantOptions = computed(() => 
  restaurants.value.map(r => ({ value: r.id, label: r.name }))
);

const tabs = [
  { value: 'cities', label: 'Cities' },
  { value: 'hotels', label: 'Hotels' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'medical', label: 'Medical' },
  { value: 'tours', label: 'Tours' },
  { value: 'transport', label: 'Transport' },
  { value: 'cityplaces', label: 'City Places' },
  { value: 'esim', label: 'eSIM Plans' },
  { value: 'guides', label: 'Guides' },
  { value: 'food-categories', label: 'Food Categories' },
  { value: 'food-items', label: 'Food Items' },
];

const cityColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'status', label: 'Status' },
];

const hotelColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'price', label: 'Price From' },
  { key: 'verified', label: 'Verified' },
];

const externalHotelColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'star_rating', label: 'Stars' },
  { key: 'synced', label: 'Last Synced' },
];

const cacheColumns = [
  { key: 'dest_id', label: 'Destination ID' },
  { key: 'search_type', label: 'Type' },
  { key: 'hotels', label: 'Hotels' },
  { key: 'created', label: 'Created' },
];

const restaurantColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'halal', label: 'Halal Status' },
];

const medicalColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'type', label: 'Type' },
  { key: 'verified', label: 'Verified' },
];

const tourColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'price', label: 'Price From' },
];

const transportColumns = [
  { key: 'type', label: 'Type' },
  { key: 'city', label: 'City' },
  { key: 'price', label: 'Base Price' },
];

const cityplaceColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'rating', label: 'Rating' },
  { key: 'status', label: 'Status' },
];

const guideColumns = [
  { key: 'display_name', label: 'Name', sortable: true },
  { key: 'city', label: 'City' },
  { key: 'rating', label: 'Rating' },
  { key: 'verified', label: 'Verified' },
  { key: 'hourly_rate', label: 'Hourly Rate' },
];

const esimColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'provider', label: 'Provider', sortable: true },
  { key: 'region_text', label: 'Region' },
  { key: 'data_text', label: 'Data' },
  { key: 'validity_days', label: 'Validity' },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'status', label: 'Status' },
];

const foodCategoryColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'name_cn', label: 'Chinese Name' },
  { key: 'icon', label: 'Icon' },
  { key: 'sort_order', label: 'Sort Order', sortable: true },
  { key: 'status', label: 'Status' },
];

const foodItemColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'halal', label: 'Halal' },
];

// Modals
const showCityModal = ref(false);
const showHotelModal = ref(false);
const showRestaurantModal = ref(false);
const showMedicalModal = ref(false);
const showTourModal = ref(false);
const showTransportModal = ref(false);
const showCityplaceModal = ref(false);
const showGuideModal = ref(false);
const showEsimModal = ref(false);
const showFoodCategoryModal = ref(false);
const showFoodItemModal = ref(false);

const editingCity = ref<any>(null);
const editingHotel = ref<any>(null);
const editingRestaurant = ref<any>(null);
const editingMedical = ref<any>(null);
const editingTour = ref<any>(null);
const editingTransport = ref<any>(null);
const editingCityplace = ref<any>(null);
const editingGuide = ref<any>(null);
const editingEsim = ref<any>(null);
const editingFoodCategory = ref<any>(null);
const editingFoodItem = ref<any>(null);

const saving = ref(false);

// Forms
const cityForm = ref({
  name: '',
  slug: '',
  country: 'China',
  is_active: true,
  description: '',
  highlights: [] as string[],
  highlightsText: '',
  image_ids: [] as string[],
});

const hotelForm = ref({
  city_id: '',
  name: '',
  address: '',
  geo_lat: null as number | null,
  geo_lng: null as number | null,
  price_from: null as number | null,
  price_to: null as number | null,
  currency: 'CNY',
  verified: false,
  rating: null as number | null,
  review_count: 0,
  star_rating: null as number | null,
  checkin_time: '',
  checkout_time: '',
  description: '',
  amenities: [] as string[],
  amenitiesText: '',
  facilities: [] as string[],
  facilitiesText: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  image_ids: [] as string[],
});

const restaurantForm = ref({
  city_id: '',
  name: '',
  address: '',
  geo_lat: null as number | null,
  geo_lng: null as number | null,
  halal_verified: false,
  delivery_supported: false,
  rating: null as number | null,
  review_count: 0,
  cuisine_type: '',
  price_range: '',
  opening_hours: null as any,
  description: '',
  specialties: [] as string[],
  specialtiesText: '',
  amenities: [] as string[],
  amenitiesText: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  image_ids: [] as string[],
});

const medicalForm = ref({
  city_id: '',
  name: '',
  type: 'hospital',
  address: '',
  geo_lat: null as number | null,
  geo_lng: null as number | null,
  verified: false,
  rating: null as number | null,
  review_count: 0,
  specialties: [] as string[],
  specialtiesText: '',
  services: [] as string[],
  servicesText: '',
  opening_hours: null as any,
  emergency_available: false,
  languages: [] as string[],
  languagesText: '',
  description: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  image_ids: [] as string[],
});

const tourForm = ref({
  city_id: '',
  name: '',
  duration_text: '',
  duration_hours: null as number | null,
  price_from: null as number | null,
  price_to: null as number | null,
  currency: 'CNY',
  rating: null as number | null,
  review_count: 0,
  highlights: [] as string[],
  highlightsText: '',
  inclusions: [] as string[],
  inclusionsText: '',
  exclusions: [] as string[],
  exclusionsText: '',
  meeting_point: '',
  cancellation_policy: '',
  languages: [] as string[],
  languagesText: '',
  max_group_size: null as number | null,
  min_group_size: null as number | null,
  description: '',
  image_ids: [] as string[],
});

const transportForm = ref({
  city_id: '',
  name: '',
  type: 'pickup',
  base_price: 0,
  price_per_km: null as number | null,
  currency: 'CNY',
  vehicle_type: '',
  capacity: null as number | null,
  rating: null as number | null,
  review_count: 0,
  description: '',
  features: [] as string[],
  featuresText: '',
  image_ids: [] as string[],
});

const cityplaceForm = ref({
  city_id: '',
  name: '',
  slug: '',
  short_description: '',
  description: '',
  address: '',
  geo_lat: null as number | null,
  geo_lng: null as number | null,
  cost_range: '',
  opening_hours: null as any,
  customer_support_phone: '',
  is_family_friendly: false,
  is_pet_friendly: false,
  is_active: true,
  image_ids: [] as string[],
  tour_ids: [] as string[],
});

const guideForm = ref({
  user_id: '',
  city_id: '',
  display_name: '',
  bio: '',
  languages: [] as string[],
  languagesText: '',
  hourly_rate: undefined as number | undefined,
  daily_rate: undefined as number | undefined,
  verified: false,
  image_ids: [] as string[],
});

const esimForm = ref({
  name: '',
  package_code: '',
  provider: '',
  country: 'China',
  region_text: '',
  package_type: 'single_country',
  data_text: '',
  data_amount_gb: null as number | null,
  data_period: '',
  validity_days: 0,
  price: 0,
  currency: 'USD',
  is_active: true,
  data_speed: '',
  supported_operators: [] as string[],
  sms_enabled: false,
  number_available: false,
  description: '',
  image_ids: [] as string[],
});

const foodCategoryForm = ref({
  name: '',
  name_cn: '',
  description: '',
  icon: '',
  sort_order: 0,
  is_active: true,
});

const foodItemForm = ref({
  restaurant_id: '',
  category_id: '',
  name: '',
  name_cn: '',
  description: '',
  price: 0,
  currency: 'CNY',
  is_available: true,
  is_vegetarian: false,
  is_vegan: false,
  is_halal: true,
  spicy_level: 0,
  allergens: [] as string[],
  ingredients: [] as string[],
  nutrition_info: null as any,
  preparation_time: null as number | null,
  serving_size: '',
  image_ids: [] as string[],
  sort_order: 0,
});

// Delete confirmation
const showDeleteConfirm = ref(false);
const deleteConfirmTitle = ref('');
const deleteConfirmMessage = ref('');
const deleteAction = ref<(() => Promise<void>) | null>(null);

function resetCityForm() {
  cityForm.value = {
    name: '',
    slug: '',
    country: 'China',
    is_active: true,
    description: '',
    highlights: [],
    highlightsText: '',
    image_ids: [],
  };
}

function resetHotelForm() {
  hotelForm.value = {
    city_id: '',
    name: '',
    address: '',
    geo_lat: null,
    geo_lng: null,
    price_from: null,
    price_to: null,
    currency: 'CNY',
    verified: false,
    rating: null,
    review_count: 0,
    star_rating: null,
    checkin_time: '',
    checkout_time: '',
    description: '',
    amenities: [],
    amenitiesText: '',
    facilities: [],
    facilitiesText: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    image_ids: [],
  };
}

function resetRestaurantForm() {
  restaurantForm.value = {
    city_id: '',
    name: '',
    address: '',
    geo_lat: null,
    geo_lng: null,
    halal_verified: false,
    delivery_supported: false,
    rating: null,
    review_count: 0,
    cuisine_type: '',
    price_range: '',
    opening_hours: null,
    description: '',
    specialties: [],
    specialtiesText: '',
    amenities: [],
    amenitiesText: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    image_ids: [],
  };
}

function resetMedicalForm() {
  medicalForm.value = {
    city_id: '',
    name: '',
    type: 'hospital',
    address: '',
    geo_lat: null,
    geo_lng: null,
    verified: false,
    rating: null,
    review_count: 0,
    specialties: [],
    specialtiesText: '',
    services: [],
    servicesText: '',
    opening_hours: null,
    emergency_available: false,
    languages: [],
    languagesText: '',
    description: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    image_ids: [],
  };
}

function resetTourForm() {
  tourForm.value = {
    city_id: '',
    name: '',
    duration_text: '',
    duration_hours: null,
    price_from: null,
    price_to: null,
    currency: 'CNY',
    rating: null,
    review_count: 0,
    highlights: [],
    highlightsText: '',
    inclusions: [],
    inclusionsText: '',
    exclusions: [],
    exclusionsText: '',
    meeting_point: '',
    cancellation_policy: '',
    languages: [],
    languagesText: '',
    max_group_size: null,
    min_group_size: null,
    description: '',
    image_ids: [],
  };
}

function resetTransportForm() {
  transportForm.value = {
    city_id: '',
    name: '',
    type: 'pickup',
    base_price: 0,
    price_per_km: null,
    currency: 'CNY',
    vehicle_type: '',
    capacity: null,
    rating: null,
    review_count: 0,
    description: '',
    features: [],
    featuresText: '',
    image_ids: [],
  };
}

function openCityModal(item?: any) {
  editingCity.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    cityForm.value = {
      name: item.name,
      slug: item.slug,
      country: item.country || 'China',
      is_active: item.is_active,
      description: item.description || '',
      highlights: Array.isArray(item.highlights) ? item.highlights : [],
      highlightsText: Array.isArray(item.highlights) ? item.highlights.join(', ') : '',
      image_ids: extractImageIds(item),
    };
  } else {
    resetCityForm();
  }
  showCityModal.value = true;
}

// Helper function to extract image IDs from an item (handles coverAsset, galleryAssets, and gallery_asset_ids)
function extractImageIds(item: any): string[] {
  const imageIds: string[] = [];
  // Add cover asset if exists
  if (item.coverAsset?.id) {
    imageIds.push(item.coverAsset.id);
  } else if (item.cover_asset_id) {
    imageIds.push(item.cover_asset_id);
  }
  // Add gallery assets
  if (item.galleryAssets && Array.isArray(item.galleryAssets)) {
    item.galleryAssets.forEach((asset: any) => {
      if (asset.id && !imageIds.includes(asset.id)) {
        imageIds.push(asset.id);
      }
    });
  }
  // Fallback to gallery_asset_ids if galleryAssets is not populated
  if (item.gallery_asset_ids && Array.isArray(item.gallery_asset_ids)) {
    item.gallery_asset_ids.forEach((id: string) => {
      if (id && !imageIds.includes(id)) {
        imageIds.push(id);
      }
    });
  }
  return imageIds;
}

// Helper function to ensure linked images are in availableAssets
function ensureImagesInAvailableAssets(item: any) {
  const imagesToAdd: any[] = [];
  
    // Helper to extract title from tags
    const extractTitle = (asset: any): string | null => {
      if (asset.title) return asset.title;
      if (asset.tags && Array.isArray(asset.tags)) {
        const titleTag = asset.tags.find((t: string) => t.startsWith('title:'));
        if (titleTag) return titleTag.replace('title:', '');
      }
      return null;
    };

    // Add cover asset if it exists and isn't already in availableAssets
    if (item.coverAsset) {
      const exists = mediaAssets.value.find((a: any) => a.id === item.coverAsset.id);
      if (!exists) {
        imagesToAdd.push({
          id: item.coverAsset.id,
          public_url: item.coverAsset.public_url,
          thumbnail_url: item.coverAsset.thumbnail_url,
          r2_key: item.coverAsset.r2_key,
          category: item.coverAsset.category,
          tags: item.coverAsset.tags,
          title: extractTitle(item.coverAsset),
        });
      }
    }
    
    // Add gallery assets
    if (item.galleryAssets && Array.isArray(item.galleryAssets)) {
      item.galleryAssets.forEach((asset: any) => {
        const exists = mediaAssets.value.find((a: any) => a.id === asset.id);
        if (!exists) {
          imagesToAdd.push({
            id: asset.id,
            public_url: asset.public_url,
            thumbnail_url: asset.thumbnail_url,
            r2_key: asset.r2_key,
            category: asset.category,
            tags: asset.tags,
            title: extractTitle(asset),
          });
        }
      });
    }
  
  // Add all new images to availableAssets
  if (imagesToAdd.length > 0) {
    mediaAssets.value = [...mediaAssets.value, ...imagesToAdd];
    console.log(`[CatalogPage] Added ${imagesToAdd.length} linked images to availableAssets`);
  }
}

function openHotelModal(item?: any) {
  editingHotel.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    hotelForm.value = {
      city_id: item.city_id,
      name: item.name,
      address: item.address,
      geo_lat: item.geo_lat,
      geo_lng: item.geo_lng,
      price_from: item.price_from,
      price_to: item.price_to,
      currency: item.currency || 'CNY',
      verified: item.verified,
      rating: item.rating,
      review_count: item.review_count || 0,
      star_rating: item.star_rating,
      checkin_time: item.checkin_time || '',
      checkout_time: item.checkout_time || '',
      description: item.description || '',
      amenities: Array.isArray(item.amenities) ? item.amenities : [],
      amenitiesText: Array.isArray(item.amenities) ? item.amenities.join(', ') : '',
      facilities: Array.isArray(item.facilities) ? item.facilities : [],
      facilitiesText: Array.isArray(item.facilities) ? item.facilities.join(', ') : '',
      contact_phone: item.contact_phone || '',
      contact_email: item.contact_email || '',
      website: item.website || '',
      image_ids: extractImageIds(item),
    };
  } else {
    resetHotelForm();
  }
  showHotelModal.value = true;
}

function openRestaurantModal(item?: any) {
  editingRestaurant.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    restaurantForm.value = {
      city_id: item.city_id,
      name: item.name,
      address: item.address,
      geo_lat: item.geo_lat,
      geo_lng: item.geo_lng,
      halal_verified: item.halal_verified ?? false,
      delivery_supported: item.delivery_supported ?? false,
      rating: item.rating,
      review_count: item.review_count || 0,
      cuisine_type: item.cuisine_type || '',
      price_range: item.price_range || '',
      opening_hours: item.opening_hours,
      description: item.description || '',
      specialties: Array.isArray(item.specialties) ? item.specialties : [],
      specialtiesText: Array.isArray(item.specialties) ? item.specialties.join(', ') : '',
      amenities: Array.isArray(item.amenities) ? item.amenities : [],
      amenitiesText: Array.isArray(item.amenities) ? item.amenities.join(', ') : '',
      contact_phone: item.contact_phone || '',
      contact_email: item.contact_email || '',
      website: item.website || '',
      image_ids: extractImageIds(item),
    };
  } else {
    resetRestaurantForm();
  }
  showRestaurantModal.value = true;
}

function openMedicalModal(item?: any) {
  editingMedical.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    medicalForm.value = {
      city_id: item.city_id,
      name: item.name,
      type: item.type,
      address: item.address,
      geo_lat: item.geo_lat,
      geo_lng: item.geo_lng,
      verified: item.verified ?? false,
      rating: item.rating,
      review_count: item.review_count || 0,
      specialties: Array.isArray(item.specialties) ? item.specialties : [],
      specialtiesText: Array.isArray(item.specialties) ? item.specialties.join(', ') : '',
      services: Array.isArray(item.services) ? item.services : [],
      servicesText: Array.isArray(item.services) ? item.services.join(', ') : '',
      opening_hours: item.opening_hours,
      emergency_available: item.emergency_available ?? false,
      languages: Array.isArray(item.languages) ? item.languages : [],
      languagesText: Array.isArray(item.languages) ? item.languages.join(', ') : '',
      description: item.description || '',
      contact_phone: item.contact_phone || '',
      contact_email: item.contact_email || '',
      website: item.website || '',
      image_ids: extractImageIds(item),
    };
  } else {
    resetMedicalForm();
  }
  showMedicalModal.value = true;
}

function openTourModal(item?: any) {
  editingTour.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    tourForm.value = {
      city_id: item.city_id,
      name: item.name,
      duration_text: item.duration_text || '',
      duration_hours: item.duration_hours,
      price_from: item.price_from,
      price_to: item.price_to,
      currency: item.currency || 'CNY',
      rating: item.rating,
      review_count: item.review_count || 0,
      highlights: Array.isArray(item.highlights) ? item.highlights : [],
      highlightsText: Array.isArray(item.highlights) ? item.highlights.join(', ') : '',
      inclusions: Array.isArray(item.inclusions) ? item.inclusions : [],
      inclusionsText: Array.isArray(item.inclusions) ? item.inclusions.join(', ') : '',
      exclusions: Array.isArray(item.exclusions) ? item.exclusions : [],
      exclusionsText: Array.isArray(item.exclusions) ? item.exclusions.join(', ') : '',
      meeting_point: item.meeting_point || '',
      cancellation_policy: item.cancellation_policy || '',
      languages: Array.isArray(item.languages) ? item.languages : [],
      languagesText: Array.isArray(item.languages) ? item.languages.join(', ') : '',
      max_group_size: item.max_group_size,
      min_group_size: item.min_group_size,
      description: item.description || '',
      image_ids: extractImageIds(item),
    };
  } else {
    resetTourForm();
  }
  showTourModal.value = true;
}

function openTransportModal(item?: any) {
  editingTransport.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    transportForm.value = {
      city_id: item.city_id,
      name: item.name || '',
      type: item.type,
      base_price: item.base_price,
      price_per_km: item.price_per_km,
      currency: item.currency || 'CNY',
      vehicle_type: item.vehicle_type || '',
      capacity: item.capacity,
      rating: item.rating,
      review_count: item.review_count || 0,
      description: item.description || '',
      features: Array.isArray(item.features) ? item.features : [],
      featuresText: Array.isArray(item.features) ? item.features.join(', ') : '',
      image_ids: extractImageIds(item),
    };
  } else {
    resetTransportForm();
  }
  showTransportModal.value = true;
}

async function saveCity() {
  saving.value = true;
  try {
    const data = {
      ...cityForm.value,
      highlights: cityForm.value.highlightsText
        ? cityForm.value.highlightsText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };
    delete data.highlightsText;
    
    if (editingCity.value) {
      await axios.put(`/api/admin/catalog/cities/${editingCity.value.id}`, data);
      toast.success('City updated');
    } else {
      await axios.post('/api/admin/catalog/cities', data);
      toast.success('City created');
    }
    showCityModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save city');
  } finally {
    saving.value = false;
  }
}

async function saveHotel() {
  saving.value = true;
  try {
    const data = {
      ...hotelForm.value,
      amenities: hotelForm.value.amenitiesText
        ? hotelForm.value.amenitiesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      facilities: hotelForm.value.facilitiesText
        ? hotelForm.value.facilitiesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };
    delete data.amenitiesText;
    delete data.facilitiesText;
    
    if (editingHotel.value) {
      await axios.put(`/api/admin/catalog/hotels/${editingHotel.value.id}`, data);
      toast.success('Hotel updated');
    } else {
      await axios.post('/api/admin/catalog/hotels', data);
      toast.success('Hotel created');
    }
    showHotelModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save hotel');
  } finally {
    saving.value = false;
  }
}

async function saveRestaurant() {
  saving.value = true;
  try {
    const data = {
      ...restaurantForm.value,
      specialties: restaurantForm.value.specialtiesText
        ? restaurantForm.value.specialtiesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      amenities: restaurantForm.value.amenitiesText
        ? restaurantForm.value.amenitiesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };
    delete data.specialtiesText;
    delete data.amenitiesText;
    
    if (editingRestaurant.value) {
      await axios.put(`/api/admin/catalog/restaurants/${editingRestaurant.value.id}`, data);
      toast.success('Restaurant updated');
    } else {
      await axios.post('/api/admin/catalog/restaurants', data);
      toast.success('Restaurant created');
    }
    showRestaurantModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save restaurant');
  } finally {
    saving.value = false;
  }
}

async function saveMedical() {
  saving.value = true;
  try {
    const data = {
      ...medicalForm.value,
      specialties: medicalForm.value.specialtiesText
        ? medicalForm.value.specialtiesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      services: medicalForm.value.servicesText
        ? medicalForm.value.servicesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      languages: medicalForm.value.languagesText
        ? medicalForm.value.languagesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };
    delete data.specialtiesText;
    delete data.servicesText;
    delete data.languagesText;
    
    if (editingMedical.value) {
      await axios.put(`/api/admin/catalog/medical/${editingMedical.value.id}`, data);
      toast.success('Medical center updated');
    } else {
      await axios.post('/api/admin/catalog/medical', data);
      toast.success('Medical center created');
    }
    showMedicalModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save medical center');
  } finally {
    saving.value = false;
  }
}

async function saveTour() {
  saving.value = true;
  try {
    const data = {
      ...tourForm.value,
      highlights: tourForm.value.highlightsText
        ? tourForm.value.highlightsText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      inclusions: tourForm.value.inclusionsText
        ? tourForm.value.inclusionsText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      exclusions: tourForm.value.exclusionsText
        ? tourForm.value.exclusionsText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      languages: tourForm.value.languagesText
        ? tourForm.value.languagesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };
    delete data.highlightsText;
    delete data.inclusionsText;
    delete data.exclusionsText;
    delete data.languagesText;
    
    if (editingTour.value) {
      await axios.put(`/api/admin/catalog/tours/${editingTour.value.id}`, data);
      toast.success('Tour updated');
    } else {
      await axios.post('/api/admin/catalog/tours', data);
      toast.success('Tour created');
    }
    showTourModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save tour');
  } finally {
    saving.value = false;
  }
}

async function saveTransport() {
  saving.value = true;
  try {
    if (editingTransport.value) {
      await axios.put(`/api/admin/catalog/transport/${editingTransport.value.id}`, transportForm.value);
      toast.success('Transport product updated');
    } else {
      await axios.post('/api/admin/catalog/transport', transportForm.value);
      toast.success('Transport product created');
    }
    showTransportModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save transport product');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteCity(item: any) {
  deleteConfirmTitle.value = 'Delete City';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/cities/${item.id}`);
    toast.success('City deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function confirmDeleteHotel(item: any) {
  deleteConfirmTitle.value = 'Delete Hotel';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/hotels/${item.id}`);
    toast.success('Hotel deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function confirmDeleteRestaurant(item: any) {
  deleteConfirmTitle.value = 'Delete Restaurant';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/restaurants/${item.id}`);
    toast.success('Restaurant deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function confirmDeleteMedical(item: any) {
  deleteConfirmTitle.value = 'Delete Medical Center';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/medical/${item.id}`);
    toast.success('Medical center deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function confirmDeleteTour(item: any) {
  deleteConfirmTitle.value = 'Delete Tour';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/tours/${item.id}`);
    toast.success('Tour deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function confirmDeleteTransport(item: any) {
  deleteConfirmTitle.value = 'Delete Transport Product';
  deleteConfirmMessage.value = `Are you sure you want to delete this transport product? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/transport/${item.id}`);
    toast.success('Transport product deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

async function executeDelete() {
  if (deleteAction.value) {
    await deleteAction.value();
    showDeleteConfirm.value = false;
    deleteAction.value = null;
  }
}

function handleCitySearch(query: string) {
  citySearch.value = query;
}

function handleHotelSearch(query: string) {
  hotelSearch.value = query;
}

function handleExternalHotelSearch(query: string) {
  externalHotelSearch.value = query;
}

async function refreshCache() {
  refreshingCache.value = true;
  try {
    await axios.post('/api/admin/catalog/external-hotel-cache/refresh');
    toast.success('Cache refreshed successfully');
    await loadData();
  } catch (error) {
    console.error('Failed to refresh cache', error);
    toast.error('Failed to refresh cache');
  } finally {
    refreshingCache.value = false;
  }
}

function handleRestaurantSearch(query: string) {
  restaurantSearch.value = query;
}

function handleMedicalSearch(query: string) {
  medicalSearch.value = query;
}

function handleTourSearch(query: string) {
  tourSearch.value = query;
}

function handleTransportSearch(query: string) {
  transportSearch.value = query;
}

function handleCityplaceSearch(query: string) {
  cityplaceSearch.value = query;
}

function handleGuideSearch(query: string) {
  guideSearch.value = query;
}

function resetCityplaceForm() {
  cityplaceForm.value = {
    city_id: '',
    name: '',
    slug: '',
    short_description: '',
    description: '',
    address: '',
    geo_lat: null,
    geo_lng: null,
    cost_range: '',
    opening_hours: null,
    customer_support_phone: '',
    is_family_friendly: false,
    is_pet_friendly: false,
    is_active: true,
    image_ids: [],
    tour_ids: [],
  };
}

function openCityplaceModal(item?: any) {
  editingCityplace.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    cityplaceForm.value = {
      city_id: item.city_id,
      name: item.name,
      slug: item.slug,
      short_description: item.short_description || '',
      description: item.description || '',
      address: item.address,
      geo_lat: item.geo_lat,
      geo_lng: item.geo_lng,
      cost_range: item.cost_range || '',
      opening_hours: item.opening_hours,
      customer_support_phone: item.customer_support_phone || '',
      is_family_friendly: item.is_family_friendly || false,
      is_pet_friendly: item.is_pet_friendly || false,
      is_active: item.is_active,
      image_ids: extractImageIds(item),
      tour_ids: item.tourLinks ? item.tourLinks.map((link: any) => link.tour_id) : [],
    };
  } else {
    resetCityplaceForm();
  }
  showCityplaceModal.value = true;
}

async function saveCityplace() {
  saving.value = true;
  try {
    if (editingCityplace.value) {
      await axios.put(`/api/admin/catalog/cityplaces/${editingCityplace.value.id}`, cityplaceForm.value);
      toast.success('City place updated');
    } else {
      await axios.post('/api/admin/catalog/cityplaces', cityplaceForm.value);
      toast.success('City place created');
    }
    showCityplaceModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save city place');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteCityplace(item: any) {
  deleteConfirmTitle.value = 'Delete City Place';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/cityplaces/${item.id}`);
    toast.success('City place deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function resetGuideForm() {
  guideForm.value = {
    user_id: '',
    city_id: '',
    display_name: '',
    bio: '',
    languages: [],
    languagesText: '',
    hourly_rate: undefined,
    daily_rate: undefined,
    verified: false,
    image_ids: [],
  };
}

function openGuideModal(item?: any) {
  editingGuide.value = item || null;
  if (item) {
    // Ensure linked images are in availableAssets so MultiImagePicker can display them
    ensureImagesInAvailableAssets(item);
    
    guideForm.value = {
      user_id: item.user_id || '',
      city_id: item.city_id,
      display_name: item.display_name,
      bio: item.bio || '',
      languages: Array.isArray(item.languages) ? item.languages : [],
      languagesText: Array.isArray(item.languages) ? item.languages.join(', ') : '',
      hourly_rate: item.hourly_rate ?? undefined,
      daily_rate: item.daily_rate ?? undefined,
      verified: item.verified ?? false,
      image_ids: extractImageIds(item),
    };
  } else {
    resetGuideForm();
  }
  showGuideModal.value = true;
}

async function saveGuide() {
  saving.value = true;
  try {
    // Validate required fields (user_id is now optional)
    if (!guideForm.value.city_id) {
      toast.error('City is required');
      return;
    }
    if (!guideForm.value.display_name) {
      toast.error('Display Name is required');
      return;
    }

    const data = {
      user_id: guideForm.value.user_id || null, // Optional - can be null for unclaimed profiles
      city_id: guideForm.value.city_id,
      display_name: guideForm.value.display_name,
      bio: guideForm.value.bio || null,
      languages: guideForm.value.languagesText
        ? guideForm.value.languagesText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      hourly_rate: guideForm.value.hourly_rate !== undefined && guideForm.value.hourly_rate !== null ? guideForm.value.hourly_rate : null,
      daily_rate: guideForm.value.daily_rate !== undefined && guideForm.value.daily_rate !== null ? guideForm.value.daily_rate : null,
      verified: guideForm.value.verified || false,
      cover_asset_id: guideForm.value.image_ids.length > 0 ? guideForm.value.image_ids[0] : null,
    };
    
    console.log('[CatalogPage] Saving guide:', { editing: !!editingGuide.value, data });
    
    if (editingGuide.value) {
      await axios.put(`/api/admin/catalog/guides/${editingGuide.value.id}`, data);
      toast.success('Guide updated');
    } else {
      // Use admin endpoint to create guide with specified user_id
      const response = await axios.post('/api/admin/catalog/guides', data);
      console.log('[CatalogPage] Guide created:', response.data);
      toast.success('Guide created');
    }
    showGuideModal.value = false;
    resetGuideForm();
    editingGuide.value = null;
    await loadData();
  } catch (error: any) {
    console.error('[CatalogPage] Failed to save guide:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to save guide';
    toast.error(errorMessage);
  } finally {
    saving.value = false;
  }
}

function confirmDeleteGuide(item: any) {
  deleteConfirmTitle.value = 'Delete Guide';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.display_name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/guides/${item.user_id}`);
    toast.success('Guide deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

// eSIM Functions
function handleEsimSearch(query: string) {
  esimSearch.value = query;
  loadEsim();
}

async function loadEsim() {
  try {
    const params: any = { page: esimPagination.value.page, limit: esimPagination.value.limit };
    if (esimSearch.value) params.search = esimSearch.value;
    const response = await axios.get('/api/admin/esim/plans', { params });
    esim.value = response.data.data || [];
    esimPagination.value = {
      page: response.data.page || 1,
      limit: response.data.limit || 50,
      total: response.data.total || 0,
      totalPages: response.data.totalPages || 0,
    };
  } catch (error) {
    console.error('Failed to load eSIM plans', error);
    toast.error('Failed to load eSIM plans');
  }
}

function handleEsimPageChange(page: number) {
  esimPagination.value.page = page;
  loadEsim();
}

function openEsimModal(item?: any) {
  editingEsim.value = item || null;
  if (item) {
    ensureImagesInAvailableAssets(item);
    esimForm.value = {
      name: item.name || '',
      package_code: item.package_code || '',
      provider: item.provider || '',
      country: item.country || 'China',
      region_text: item.region_text || '',
      package_type: item.package_type || 'single_country',
      data_text: item.data_text || '',
      data_amount_gb: item.data_amount_gb,
      data_period: item.data_period || '',
      validity_days: item.validity_days || 0,
      price: item.price || 0,
      currency: item.currency || 'USD',
      is_active: item.is_active ?? true,
      data_speed: item.data_speed || '',
      supported_operators: Array.isArray(item.supported_operators) ? item.supported_operators : [],
      sms_enabled: item.sms_enabled || false,
      number_available: item.number_available || false,
      description: item.description || '',
      image_ids: extractImageIds(item),
    };
  } else {
    esimForm.value = {
      name: '',
      package_code: '',
      provider: '',
      country: 'China',
      region_text: '',
      package_type: 'single_country',
      data_text: '',
      data_amount_gb: null,
      data_period: '',
      validity_days: 0,
      price: 0,
      currency: 'USD',
      is_active: true,
      data_speed: '',
      supported_operators: [],
      sms_enabled: false,
      number_available: false,
      description: '',
      image_ids: [],
    };
  }
  showEsimModal.value = true;
}

async function saveEsim() {
  saving.value = true;
  try {
    const data = {
      ...esimForm.value,
      supported_operators: Array.isArray(esimForm.value.supported_operators) ? esimForm.value.supported_operators : [],
    };
    if (editingEsim.value) {
      await axios.put(`/api/admin/esim/plans/${editingEsim.value.id}`, data);
      toast.success('eSIM plan updated');
    } else {
      await axios.post('/api/admin/esim/plans', data);
      toast.success('eSIM plan created');
    }
    showEsimModal.value = false;
    await loadEsim();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save eSIM plan');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteEsim(item: any) {
  deleteConfirmTitle.value = 'Delete eSIM Plan';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/esim/plans/${item.id}`);
    toast.success('eSIM plan deleted');
    await loadEsim();
  };
  showDeleteConfirm.value = true;
}

// Food Category Functions
function handleFoodCategorySearch(query: string) {
  foodCategorySearch.value = query;
  loadFoodCategories();
}

async function loadFoodCategories() {
  try {
    const params: any = { page: foodCategoryPagination.value.page, limit: foodCategoryPagination.value.limit };
    if (foodCategorySearch.value) params.search = foodCategorySearch.value;
    const response = await axios.get('/api/admin/catalog/food-categories', { params });
    foodCategories.value = response.data.data || [];
    foodCategoryPagination.value = {
      page: response.data.page || 1,
      limit: response.data.limit || 50,
      total: response.data.total || 0,
      totalPages: response.data.totalPages || 0,
    };
  } catch (error) {
    console.error('Failed to load food categories', error);
    toast.error('Failed to load food categories');
  }
}

function handleFoodCategoryPageChange(page: number) {
  foodCategoryPagination.value.page = page;
  loadFoodCategories();
}

function openFoodCategoryModal(item?: any) {
  editingFoodCategory.value = item || null;
  if (item) {
    foodCategoryForm.value = {
      name: item.name || '',
      name_cn: item.name_cn || '',
      description: item.description || '',
      icon: item.icon || '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active ?? true,
    };
  } else {
    foodCategoryForm.value = {
      name: '',
      name_cn: '',
      description: '',
      icon: '',
      sort_order: 0,
      is_active: true,
    };
  }
  showFoodCategoryModal.value = true;
}

async function saveFoodCategory() {
  saving.value = true;
  try {
    if (editingFoodCategory.value) {
      await axios.put(`/api/admin/catalog/food-categories/${editingFoodCategory.value.id}`, foodCategoryForm.value);
      toast.success('Food category updated');
    } else {
      await axios.post('/api/admin/catalog/food-categories', foodCategoryForm.value);
      toast.success('Food category created');
    }
    showFoodCategoryModal.value = false;
    await loadFoodCategories();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save food category');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteFoodCategory(item: any) {
  deleteConfirmTitle.value = 'Delete Food Category';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/food-categories/${item.id}`);
    toast.success('Food category deleted');
    await loadFoodCategories();
  };
  showDeleteConfirm.value = true;
}

// Food Item Functions
function handleFoodItemSearch(query: string) {
  foodItemSearch.value = query;
  loadFoodItems();
}

async function loadFoodItems() {
  try {
    const params: any = { page: foodItemPagination.value.page, limit: foodItemPagination.value.limit };
    if (foodItemSearch.value) params.search = foodItemSearch.value;
    const response = await axios.get('/api/admin/catalog/food-items', { params });
    foodItems.value = response.data.data || [];
    foodItemPagination.value = {
      page: response.data.page || 1,
      limit: response.data.limit || 50,
      total: response.data.total || 0,
      totalPages: response.data.totalPages || 0,
    };
  } catch (error) {
    console.error('Failed to load food items', error);
    toast.error('Failed to load food items');
  }
}

function handleFoodItemPageChange(page: number) {
  foodItemPagination.value.page = page;
  loadFoodItems();
}

function openFoodItemModal(item?: any) {
  editingFoodItem.value = item || null;
  if (item) {
    ensureImagesInAvailableAssets(item);
    foodItemForm.value = {
      restaurant_id: item.restaurant_id || '',
      category_id: item.category_id || '',
      name: item.name || '',
      name_cn: item.name_cn || '',
      description: item.description || '',
      price: item.price || 0,
      currency: item.currency || 'CNY',
      is_available: item.is_available ?? true,
      is_vegetarian: item.is_vegetarian || false,
      is_vegan: item.is_vegan || false,
      is_halal: item.is_halal ?? true,
      spicy_level: item.spicy_level || 0,
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
      nutrition_info: item.nutrition_info || null,
      preparation_time: item.preparation_time,
      serving_size: item.serving_size || '',
      image_ids: extractImageIds(item),
      sort_order: item.sort_order || 0,
    };
  } else {
    foodItemForm.value = {
      restaurant_id: '',
      category_id: '',
      name: '',
      name_cn: '',
      description: '',
      price: 0,
      currency: 'CNY',
      is_available: true,
      is_vegetarian: false,
      is_vegan: false,
      is_halal: true,
      spicy_level: 0,
      allergens: [],
      ingredients: [],
      nutrition_info: null,
      preparation_time: null,
      serving_size: '',
      image_ids: [],
      sort_order: 0,
    };
  }
  showFoodItemModal.value = true;
}

async function saveFoodItem() {
  saving.value = true;
  try {
    if (editingFoodItem.value) {
      await axios.put(`/api/admin/catalog/food-items/${editingFoodItem.value.id}`, foodItemForm.value);
      toast.success('Food item updated');
    } else {
      await axios.post('/api/admin/catalog/food-items', foodItemForm.value);
      toast.success('Food item created');
    }
    showFoodItemModal.value = false;
    await loadFoodItems();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save food item');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteFoodItem(item: any) {
  deleteConfirmTitle.value = 'Delete Food Item';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/catalog/food-items/${item.id}`);
    toast.success('Food item deleted');
    await loadFoodItems();
  };
  showDeleteConfirm.value = true;
}

async function loadMediaAssets() {
  try {
    const response = await axios.get('/api/admin/media?limit=1000'); // Load more assets for picker
    // API returns { media, total, page, totalPages }
    mediaAssets.value = Array.isArray(response.data.media) ? response.data.media : [];
    console.log('[CatalogPage] Loaded media assets:', mediaAssets.value.length);
  } catch (error) {
    console.error('Failed to load media assets', error);
    toast.error('Failed to load media assets');
  }
}

async function loadData() {
  try {
    const [citiesRes, hotelsRes, restaurantsRes, medicalRes, toursRes, transportRes, cityplacesRes, guidesRes, usersRes] = await Promise.all([
      axios.get('/api/admin/catalog/cities'),
      axios.get('/api/admin/catalog/hotels'),
      axios.get('/api/admin/catalog/restaurants'),
      axios.get('/api/admin/catalog/medical'),
      axios.get('/api/admin/catalog/tours'),
      axios.get('/api/admin/catalog/transport'),
      axios.get('/api/admin/catalog/cityplaces'),
      axios.get('/api/admin/catalog/guides'),
      axios.get('/api/admin/users').catch(() => ({ data: [] })), // Load users, but don't fail if endpoint doesn't exist
    ]);
    cities.value = citiesRes.data;
    hotels.value = hotelsRes.data?.data || hotelsRes.data || [];
    restaurants.value = restaurantsRes.data?.data || restaurantsRes.data || [];
    medical.value = medicalRes.data?.data || medicalRes.data || [];
    tours.value = toursRes.data?.data || toursRes.data || [];
    transport.value = transportRes.data?.data || transportRes.data || [];
    cityplaces.value = cityplacesRes.data?.data || cityplacesRes.data || [];
    guides.value = guidesRes.data?.data || guidesRes.data || [];
    users.value = usersRes.data || [];
  } catch (error) {
    console.error('Failed to load catalog data', error);
    toast.error('Failed to load catalog data');
  }
}

const userOptions = computed(() => 
  users.value.map(u => ({ 
    value: u.id, 
    label: u.email || u.phone || `User ${u.id}` 
  }))
);

// Watch activeTab to load data when switching tabs
watch(activeTab, (newTab) => {
  if (newTab === 'esim') {
    loadEsim();
  } else if (newTab === 'food-categories') {
    loadFoodCategories();
  } else if (newTab === 'food-items') {
    loadFoodItems();
  }
}, { immediate: true });

onMounted(() => {
  loadData();
  loadMediaAssets();
  // Load initial tab data
  if (activeTab.value === 'esim') {
    loadEsim();
  } else if (activeTab.value === 'food-categories') {
    loadFoodCategories();
  } else if (activeTab.value === 'food-items') {
    loadFoodItems();
  }
});
</script>

