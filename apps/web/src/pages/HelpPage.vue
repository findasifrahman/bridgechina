<template>
  <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <PageHeader
      title="Help Center"
      subtitle="Emergency guides and helpful information"
    />
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <h3 class="text-xl font-semibold">Emergency Contacts</h3>
        </CardHeader>
        <CardBody>
          <ul class="space-y-2">
            <li><strong>Police:</strong> 110</li>
            <li><strong>Medical:</strong> 120</li>
            <li><strong>Fire:</strong> 119</li>
            <li><strong>BridgeChina Support:</strong> +86 123 4567 890</li>
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 class="text-xl font-semibold">What to do if you're sick</h3>
        </CardHeader>
        <CardBody>
          <p class="text-slate-600">Contact our medical assistance service immediately. We can connect you with English-speaking doctors and provide translation support.</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 class="text-xl font-semibold">Lost passport</h3>
        </CardHeader>
        <CardBody>
          <p class="text-slate-600">Contact your embassy immediately. We can help you with translation and transportation to the embassy.</p>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PageHeader, Card, CardHeader, CardBody } from '@bridgechina/ui';
</script>

