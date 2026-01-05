<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50">
    <!-- Hero Section -->
    <div class="relative bg-gradient-to-br from-teal-600 via-blue-600 to-indigo-700 overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3'); background-size: cover; background-position: center;"></div>
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div class="text-center text-white">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
            BridgeChina Services
          </h1>
          <p class="text-xl md:text-2xl text-white/90 mb-6 drop-shadow-md max-w-3xl mx-auto">
            Your complete solution for navigating China. From hotels to medical help, we've got you covered.
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
              ✓ Verified Services
            </Badge>
            <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
              ✓ 24/7 Support
            </Badge>
            <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
              ✓ Multilingual
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Services Grid -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Hotel Booking -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-teal-200">
          <div class="relative h-48 bg-gradient-to-br from-teal-500 to-cyan-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <Hotel class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Verified</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Hotel Booking</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Find and book verified hotels across China. All accommodations are personally verified for quality, safety, and comfort. 
              We offer hotels in major cities with English-speaking staff, modern amenities, and competitive pricing.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>Verified accommodations</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>Best price guarantee</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>English-speaking support</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>24/7 customer service</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Book:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Browse hotels on our <router-link to="/services/hotel" class="text-teal-600 hover:underline font-medium">hotel list page</router-link></li>
                <li>Select your preferred hotel and dates</li>
                <li>Submit a booking request</li>
                <li>Our team will confirm within 24 hours</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/hotel')">
              Browse Hotels
            </Button>
          </CardBody>
        </Card>

        <!-- Transport Service -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-blue-200">
          <div class="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <Car class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Safe & Reliable</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Transport Service</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Safe, reliable transportation across China. From airport pickups to point-to-point transfers and full-day charters. 
              All drivers are verified, insured, and speak English. Professional vehicles with GPS tracking for your safety.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-blue-600" />
                <span>Airport pickup & drop-off</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-blue-600" />
                <span>Point-to-point transfers</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-blue-600" />
                <span>Full-day vehicle charter</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-blue-600" />
                <span>GPS tracking & insurance</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Book:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Visit our <router-link to="/services/transport" class="text-blue-600 hover:underline font-medium">transport service page</router-link></li>
                <li>Select vehicle type and route</li>
                <li>Submit your request with pickup details</li>
                <li>Receive confirmation within 1 hour</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/transport')">
              Book Transport
            </Button>
          </CardBody>
        </Card>

        <!-- Halal Food -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-amber-200">
          <div class="relative h-48 bg-gradient-to-br from-amber-500 to-orange-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <UtensilsCrossed class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Halal Certified</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Halal Food</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Discover authentic halal restaurants and food items across China. All restaurants are verified for halal certification. 
              Order delicious halal meals with delivery support. Browse menus, read reviews, and order directly from verified halal establishments.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Halal-certified restaurants</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Food delivery available</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Menu browsing & reviews</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>5-minute order confirmation</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Order:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Browse <router-link to="/services/halal-food" class="text-amber-600 hover:underline font-medium">halal food items</router-link> or restaurants</li>
                <li>Select your favorite dishes</li>
                <li>Click "Order" (login required)</li>
                <li>Our team contacts you within 5 minutes</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/halal-food')">
              Browse Halal Food
            </Button>
          </CardBody>
        </Card>

        <!-- Medical Help -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-red-200">
          <div class="relative h-48 bg-gradient-to-br from-red-500 to-pink-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <HeartPulse class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">24/7 Emergency</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Medical Help</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Connect with English-speaking medical professionals and verified medical centers across China. 
              From routine checkups to emergency care, we help you find the right medical assistance with translation support.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-red-600" />
                <span>English-speaking doctors</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-red-600" />
                <span>24/7 emergency support</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-red-600" />
                <span>Translation assistance</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-red-600" />
                <span>Verified medical centers</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Request:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Visit our <router-link to="/services/medical" class="text-red-600 hover:underline font-medium">medical centers page</router-link></li>
                <li>Find a medical center near you</li>
                <li>Click "Request Assistance" (login required)</li>
                <li>We contact you within 1 hour</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/medical')">
              Find Medical Help
            </Button>
          </CardBody>
        </Card>

        <!-- Local Guides -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-teal-200">
          <div class="relative h-48 bg-gradient-to-br from-teal-500 to-emerald-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <User class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Verified Guides</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Local Guides</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Hire experienced local guides who speak your language. Our guides are verified, knowledgeable, and can help you 
              navigate China's cities, translate conversations, and discover hidden gems. Available for hourly or daily rates.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>Multilingual guides</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>Local expertise & translation</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>Hourly or daily rates</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-teal-600" />
                <span>Verified & rated guides</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Book:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Browse <router-link to="/services/guide" class="text-teal-600 hover:underline font-medium">available guides</router-link></li>
                <li>View guide profiles and languages</li>
                <li>Click "Request Guide" (login required)</li>
                <li>We connect you within 1 hour</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/guide')">
              Find a Guide
            </Button>
          </CardBody>
        </Card>

        <!-- Tours & Experiences -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-purple-200">
          <div class="relative h-48 bg-gradient-to-br from-purple-500 to-indigo-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <MapPin class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Curated</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Tours & Experiences</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Discover China through curated tours and experiences. From city tours to cultural experiences, food tours, and photo walks. 
              All tours are carefully designed to show you the best of China with English-speaking guides.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-purple-600" />
                <span>City & cultural tours</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-purple-600" />
                <span>Food & photo tours</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-purple-600" />
                <span>Flexible group sizes</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-purple-600" />
                <span>English-speaking guides</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Book:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Explore <router-link to="/services/tours" class="text-purple-600 hover:underline font-medium">available tours</router-link></li>
                <li>Select your preferred tour</li>
                <li>Click "Book Tour"</li>
                <li>Our team confirms your booking</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/tours')">
              Browse Tours
            </Button>
          </CardBody>
        </Card>

        <!-- eSIM Plans -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-indigo-200">
          <div class="relative h-48 bg-gradient-to-br from-indigo-500 to-blue-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <Smartphone class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Instant</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">eSIM Plans</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Stay connected in China with our eSIM data plans. Instant activation, no physical SIM card needed. 
              Choose from various data packages with or without phone numbers. Perfect for tourists and business travelers.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-indigo-600" />
                <span>Instant activation</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-indigo-600" />
                <span>No physical SIM needed</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-indigo-600" />
                <span>Multiple data packages</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-indigo-600" />
                <span>With or without phone number</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Purchase:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Browse <router-link to="/services/esim" class="text-indigo-600 hover:underline font-medium">eSIM plans</router-link></li>
                <li>Select your data package</li>
                <li>Click "Purchase" (login required)</li>
                <li>Receive activation details within 1 hour</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/services/esim')">
              View eSIM Plans
            </Button>
          </CardBody>
        </Card>

        <!-- Shopping -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-amber-200">
          <div class="relative h-48 bg-gradient-to-br from-amber-500 to-yellow-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <ShoppingBag class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">1688.com</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">Shopping</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Shop from China's largest wholesale marketplace (1688.com). Browse millions of products at wholesale prices. 
              We help you find, verify, and purchase products with our sourcing service. Perfect for businesses and bulk buyers.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Millions of products</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Wholesale prices</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Image & keyword search</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-amber-600" />
                <span>Sourcing assistance</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Shop:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Visit our <router-link to="/shopping" class="text-amber-600 hover:underline font-medium">shopping page</router-link></li>
                <li>Search by keyword or upload image</li>
                <li>Browse products and click "Request to Buy"</li>
                <li>Our team handles sourcing & purchase</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/shopping')">
              Start Shopping
            </Button>
          </CardBody>
        </Card>

        <!-- City Places -->
        <Card class="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-emerald-200">
          <div class="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600">
            <div class="absolute inset-0 flex items-center justify-center">
              <Building2 class="h-24 w-24 text-white opacity-80" />
            </div>
            <div class="absolute top-4 right-4">
              <Badge variant="accent" class="bg-white/20 backdrop-blur-sm text-white">Must-Visit</Badge>
            </div>
          </div>
          <CardBody class="p-6">
            <h2 class="text-2xl font-bold text-slate-900 mb-3">City Places</h2>
            <p class="text-slate-700 mb-4 leading-relaxed">
              Discover must-visit places in Chinese cities. From historical sites to modern attractions, markets, and cultural landmarks. 
              Get detailed information, opening hours, and book tours to these amazing destinations.
            </p>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-emerald-600" />
                <span>Curated city attractions</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-emerald-600" />
                <span>Detailed information & reviews</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-emerald-600" />
                <span>Tour booking available</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600">
                <Check class="h-4 w-4 text-emerald-600" />
                <span>Family & pet-friendly filters</span>
              </div>
            </div>
            <div class="pt-4 border-t border-slate-200">
              <p class="text-sm font-semibold text-slate-900 mb-2">How to Explore:</p>
              <ol class="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Browse <router-link to="/places" class="text-emerald-600 hover:underline font-medium">city places</router-link></li>
                <li>Filter by city and preferences</li>
                <li>View place details and reviews</li>
                <li>Request a tour to visit</li>
              </ol>
            </div>
            <Button variant="primary" full-width class="mt-4" @click="router.push('/places')">
              Explore Places
            </Button>
          </CardBody>
        </Card>
      </div>

      <!-- CTA Section -->
      <div class="mt-16 text-center">
        <Card class="bg-gradient-to-r from-teal-600 to-blue-600 border-0">
          <CardBody class="p-8 text-white">
            <h2 class="text-3xl font-bold mb-4">Need Help Choosing?</h2>
            <p class="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Our team is here to help you find the perfect services for your needs. Contact us via WhatsApp or submit a general request.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" class="bg-white text-teal-600 hover:bg-white/90" @click="openWhatsApp">
                <MessageCircle class="h-5 w-5 mr-2" />
                Chat on WhatsApp
              </Button>
              <Button variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30" @click="router.push('/request')">
                <Sparkles class="h-5 w-5 mr-2" />
                Submit Request
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  Hotel,
  Car,
  UtensilsCrossed,
  HeartPulse,
  User,
  MapPin,
  Smartphone,
  ShoppingBag,
  Building2,
  Check,
  MessageCircle,
  Sparkles,
} from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
} from '@bridgechina/ui';
import { useWhatsApp } from '@/composables/useWhatsApp';

const router = useRouter();

const { openWhatsApp: openWhatsAppComposable } = useWhatsApp();

function openWhatsApp() {
  openWhatsAppComposable();
}
</script>
