type TurnstileRenderOptions = {
  sitekey: string;
  size?: 'normal' | 'compact' | 'flexible' | 'invisible';
  theme?: 'light' | 'dark' | 'auto';
  action?: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function getTurnstileSiteKey(): string {
  return String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '').trim();
}

function loadTurnstileScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;

    const handleReady = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        reject(new Error('Cloudflare Turnstile failed to initialize'));
      }
    };

    if (existing) {
      existing.addEventListener('load', handleReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('Cloudflare Turnstile failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleReady, { once: true });
    script.addEventListener('error', () => reject(new Error('Cloudflare Turnstile failed to load')), { once: true });
    document.head.appendChild(script);
  });
}

export async function getTurnstileToken(action = 'shopping_search'): Promise<string | undefined> {
  const siteKey = getTurnstileSiteKey();
  if (!siteKey || typeof window === 'undefined' || typeof document === 'undefined') return undefined;

  const turnstile = await loadTurnstileScript();
  const container = document.createElement('div');
  container.className = 'cf-turnstile';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.width = '1px';
  container.style.height = '1px';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  let widgetId = '';

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (widgetId) {
        try {
          turnstile.remove(widgetId);
        } catch {
          // Non-critical: the detached container will still be removed below.
        }
      }
      container.remove();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Cloudflare Turnstile timed out'));
    }, 10000);

    widgetId = turnstile.render(container, {
      sitekey: siteKey,
      theme: 'light',
      size: 'invisible',
      action,
      callback: (token) => {
        window.clearTimeout(timeout);
        cleanup();
        resolve(token);
      },
      'error-callback': () => {
        window.clearTimeout(timeout);
        cleanup();
        reject(new Error('Cloudflare Turnstile verification failed'));
      },
      'expired-callback': () => {
        window.clearTimeout(timeout);
        cleanup();
        reject(new Error('Cloudflare Turnstile token expired'));
      },
    });

    turnstile.execute(widgetId);
  });
}
