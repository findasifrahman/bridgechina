<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
    <Card class="w-full max-w-md">
      <CardHeader>
        <h2 class="text-2xl font-bold text-center">Create Account</h2>
        <p class="text-sm text-slate-600 text-center mt-2">Sign up to get started</p>
      </CardHeader>
      <CardBody>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <Input
              v-model="form.email"
              label="Email (Optional)"
              type="email"
              placeholder="your@email.com"
              :error="errors.email"
              @blur="validateEmail"
            />
            <p class="text-xs text-slate-500 mt-1">We'll use this for account recovery</p>
          </div>

          <div>
            <Input
              v-model="form.phone"
              label="Phone Number"
              type="tel"
              placeholder="+86 123 4567 8900"
              required
              :error="errors.phone"
              @blur="validatePhone"
            />
            <p class="text-xs text-slate-500 mt-1">Required for account verification</p>
          </div>

          <div>
            <Input
              v-model="form.password"
              label="Password"
              type="password"
              required
              :error="errors.password"
              @blur="validatePassword"
              @input="validatePassword"
            />
            <div v-if="form.password" class="mt-2 space-y-1">
              <div class="flex items-center text-xs" :class="passwordChecks.length ? 'text-slate-600' : 'text-green-600'">
                <span class="w-4">{{ passwordChecks.length ? '○' : '✓' }}</span>
                <span>At least 8 characters</span>
              </div>
              <div class="flex items-center text-xs" :class="passwordChecks.uppercase ? 'text-slate-600' : 'text-green-600'">
                <span class="w-4">{{ passwordChecks.uppercase ? '○' : '✓' }}</span>
                <span>One uppercase letter</span>
              </div>
              <div class="flex items-center text-xs" :class="passwordChecks.lowercase ? 'text-slate-600' : 'text-green-600'">
                <span class="w-4">{{ passwordChecks.lowercase ? '○' : '✓' }}</span>
                <span>One lowercase letter</span>
              </div>
              <div class="flex items-center text-xs" :class="passwordChecks.number ? 'text-slate-600' : 'text-green-600'">
                <span class="w-4">{{ passwordChecks.number ? '○' : '✓' }}</span>
                <span>One number</span>
              </div>
            </div>
          </div>

          <div>
            <Input
              v-model="form.confirmPassword"
              label="Confirm Password"
              type="password"
              required
              :error="errors.confirmPassword"
              @blur="validateConfirmPassword"
              @input="validateConfirmPassword"
            />
          </div>

          <Button type="submit" variant="primary" :loading="loading" full-width :disabled="!isFormValid">
            Create Account
          </Button>

          <div class="text-center text-sm">
            <router-link to="/login" class="text-teal-600 hover:text-teal-700 font-medium">
              Already have an account? Sign In
            </router-link>
          </div>
        </form>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@bridgechina/ui';
import { Card, CardHeader, CardBody, Input, Button } from '@bridgechina/ui';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const form = ref({
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
});

const errors = ref({
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
});

const passwordChecks = computed(() => {
  const pwd = form.value.password;
  return {
    length: pwd.length < 8,
    uppercase: !/[A-Z]/.test(pwd),
    lowercase: !/[a-z]/.test(pwd),
    number: !/[0-9]/.test(pwd),
  };
});

const isFormValid = computed(() => {
  return (
    form.value.phone.length >= 10 &&
    /^[\+]?[0-9\s\-\(\)]+$/.test(form.value.phone) &&
    form.value.password.length >= 8 &&
    /[A-Z]/.test(form.value.password) &&
    /[a-z]/.test(form.value.password) &&
    /[0-9]/.test(form.value.password) &&
    form.value.password === form.value.confirmPassword &&
    (!form.value.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email))
  );
});

const loading = ref(false);

function validateEmail() {
  if (!form.value.email) {
    errors.value.email = '';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Please enter a valid email address';
  } else {
    errors.value.email = '';
  }
}

function validatePhone() {
  if (!form.value.phone) {
    errors.value.phone = 'Phone number is required';
    return;
  }
  if (form.value.phone.length < 10) {
    errors.value.phone = 'Phone number must be at least 10 characters';
  } else if (!/^[\+]?[0-9\s\-\(\)]+$/.test(form.value.phone)) {
    errors.value.phone = 'Please enter a valid phone number';
  } else {
    errors.value.phone = '';
  }
}

function validatePassword() {
  const pwd = form.value.password;
  if (!pwd) {
    errors.value.password = 'Password is required';
    return;
  }
  if (pwd.length < 8) {
    errors.value.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(pwd)) {
    errors.value.password = 'Password must contain at least one uppercase letter';
  } else if (!/[a-z]/.test(pwd)) {
    errors.value.password = 'Password must contain at least one lowercase letter';
  } else if (!/[0-9]/.test(pwd)) {
    errors.value.password = 'Password must contain at least one number';
  } else {
    errors.value.password = '';
  }
}

function validateConfirmPassword() {
  if (!form.value.confirmPassword) {
    errors.value.confirmPassword = 'Please confirm your password';
    return;
  }
  if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match';
  } else {
    errors.value.confirmPassword = '';
  }
}

async function handleRegister() {
  // Validate all fields
  validatePhone();
  validatePassword();
  validateConfirmPassword();
  validateEmail();

  if (!isFormValid.value) {
    toast.error('Please fix the errors in the form');
    return;
  }

  if (!form.value.phone) {
    toast.error('Phone number is required');
    return;
  }

  loading.value = true;
  try {
    await authStore.register({
      email: form.value.email || undefined,
      phone: form.value.phone,
      password: form.value.password,
    });
    
    // Determine redirect based on user role
    const userRoles = authStore.user?.roles || [];
    if (userRoles.some((role: string) => ['ADMIN', 'OPS', 'EDITOR'].includes(role))) {
      router.push('/admin');
    } else if (userRoles.includes('SELLER')) {
      router.push('/seller');
    } else {
      router.push('/user');
    }
    toast.success('Account created successfully!');
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Registration failed';
    toast.error(errorMessage);
    
    // Set field-specific errors if provided by backend
    if (error.response?.data?.field) {
      errors.value[error.response.data.field as keyof typeof errors.value] = errorMessage;
    }
  } finally {
    loading.value = false;
  }
}
</script>
