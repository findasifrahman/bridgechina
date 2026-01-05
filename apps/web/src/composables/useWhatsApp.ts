import { ref } from 'vue';
import axios from '@/utils/axios';

const whatsappNumber = ref<string>('');

/**
 * Get WhatsApp service provider number
 * Uses public config endpoint or falls back to env variable
 */
export function useWhatsApp() {
  async function getWhatsAppNumber(): Promise<string> {
    if (whatsappNumber.value) {
      return whatsappNumber.value;
    }

    try {
      const response = await axios.get('/api/public/config');
      const number = response.data?.whatsappNumber || '';
      if (number) {
        whatsappNumber.value = number;
        return number;
      }
    } catch (error) {
      console.warn('Failed to fetch WhatsApp number from config:', error);
    }

    // Fallback to env variable (for frontend)
    const envNumber = import.meta.env.VITE_BRIDGECHINA_SERVICE_PROVIDER_NUMBER || '';
    if (envNumber) {
      whatsappNumber.value = envNumber;
      return envNumber;
    }

    // Default fallback (should be configured)
    return '';
  }

  function openWhatsApp(message?: string) {
    getWhatsAppNumber().then((number) => {
      if (!number) {
        console.error('WhatsApp number not configured');
        return;
      }
      
      // Remove any non-numeric characters except +
      const cleanNumber = number.replace(/[^\d+]/g, '');
      const url = message
        ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${cleanNumber}`;
      
      window.open(url, '_blank');
    });
  }

  return {
    getWhatsAppNumber,
    openWhatsApp,
  };
}

