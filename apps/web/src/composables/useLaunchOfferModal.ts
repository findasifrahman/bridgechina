import { ref, computed } from 'vue';

// Constants
const STORAGE_KEY = 'bc_launch_modal_next_at';
const DEFAULT_COOLDOWN_HOURS = 24;
const DONT_SHOW_DAYS = 7;

/**
 * Composable for managing launch offer modal visibility with localStorage TTL
 */
export function useLaunchOfferModal() {
  const isOpen = ref(false);

  /**
   * Get timestamp for next allowed show time
   */
  function getNextShowTime(): number | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  /**
   * Set next show time (timestamp in milliseconds)
   */
  function setNextShowTime(hoursOrDays: number, isDays: boolean = false): void {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const ms = isDays ? hoursOrDays * 24 * 60 * 60 * 1000 : hoursOrDays * 60 * 60 * 1000;
    const nextAt = now + ms;
    localStorage.setItem(STORAGE_KEY, nextAt.toString());
  }

  /**
   * Check if modal should be shown (cooldown expired)
   */
  function getShouldShow(): boolean {
    if (typeof window === 'undefined') return false;
    const nextAt = getNextShowTime();
    if (nextAt === null) return true; // Never shown, show it
    return Date.now() >= nextAt; // Cooldown expired
  }

  /**
   * Open modal if cooldown has expired
   */
  function openIfDue(): void {
    if (getShouldShow()) {
      isOpen.value = true;
      // Lock body scroll
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    }
  }

  /**
   * Close modal and optionally set cooldown
   */
  function close(setCooldownDays?: number | null | undefined): void {
    isOpen.value = false;
    // Unlock body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    // Set cooldown if specified
    if (setCooldownDays !== undefined && setCooldownDays !== null) {
      setNextShowTime(setCooldownDays, true); // Days
    } else {
      setNextShowTime(DEFAULT_COOLDOWN_HOURS, false); // Hours
    }
  }

  /**
   * Open modal manually (for testing)
   */
  function open(): void {
    isOpen.value = true;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Reset cooldown (for testing)
   */
  function resetCooldown(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    isOpen,
    getShouldShow,
    openIfDue,
    close,
    open,
    resetCooldown,
  };
}

