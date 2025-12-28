<template>
  <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <PageHeader title="Contact Us" subtitle="Get in touch with our team" />
    
    <div class="grid md:grid-cols-2 gap-6 mt-8">
      <Card>
        <CardBody class="p-6">
          <div class="flex items-center space-x-3 mb-4">
            <MessageCircle class="h-6 w-6 text-teal-600" />
            <h3 class="font-semibold text-slate-900">WhatsApp</h3>
          </div>
          <p class="text-sm text-slate-600 mb-4">Chat with us on WhatsApp for instant support</p>
          <Button variant="accent" full-width @click="openWhatsApp" class="flex items-center justify-center space-x-2">
            <MessageCircle class="h-4 w-4" />
            <span>Open WhatsApp</span>
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody class="p-6">
          <div class="flex items-center space-x-3 mb-4">
            <Phone class="h-6 w-6 text-teal-600" />
            <h3 class="font-semibold text-slate-900">Phone</h3>
          </div>
          <p class="text-sm text-slate-600 mb-2">Call us for immediate assistance</p>
          <a href="tel:+861234567890" class="text-teal-600 hover:text-teal-700 font-medium">
            +86 123 4567 890
          </a>
        </CardBody>
      </Card>

      <Card>
        <CardBody class="p-6">
          <div class="flex items-center space-x-3 mb-4">
            <Mail class="h-6 w-6 text-teal-600" />
            <h3 class="font-semibold text-slate-900">Email</h3>
          </div>
          <p class="text-sm text-slate-600 mb-2">Send us an email</p>
          <a href="mailto:hello@bridgechina.com" class="text-teal-600 hover:text-teal-700 font-medium">
            hello@bridgechina.com
          </a>
        </CardBody>
      </Card>

      <Card>
        <CardBody class="p-6">
          <div class="flex items-center space-x-3 mb-4">
            <MapPin class="h-6 w-6 text-teal-600" />
            <h3 class="font-semibold text-slate-900">Office</h3>
          </div>
          <p class="text-sm text-slate-600">
            Guangzhou, China<br />
            (Address details coming soon)
          </p>
        </CardBody>
      </Card>
    </div>

    <Card class="mt-6 border-amber-200 bg-amber-50">
      <CardBody class="p-6">
        <div class="flex items-start space-x-3">
          <AlertCircle class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="font-semibold text-slate-900 mb-2">Emergency Contact</h3>
            <p class="text-sm text-slate-700 mb-2">
              For urgent medical or safety issues, call our 24/7 emergency line:
            </p>
            <a href="tel:+861234567890" class="text-amber-700 hover:text-amber-800 font-bold text-lg">
              +86 123 4567 890
            </a>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { MessageCircle, Phone, Mail, MapPin, AlertCircle } from 'lucide-vue-next';
import { PageHeader, Card, CardBody, Button } from '@bridgechina/ui';

function openWhatsApp() {
  window.open('https://wa.me/1234567890', '_blank');
}
</script>

