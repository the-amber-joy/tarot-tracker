import { writable } from "svelte/store";

function createSessionStore() {
  const { subscribe, set } = writable({
    showExpiredModal: false,
  });

  let pollingInterval: number | null = null;
  let sessionExpiredShown = false;
  let autoCloseTimeout: number | null = null;

  return {
    subscribe,
    showExpiredModal() {
      if (!sessionExpiredShown) {
        sessionExpiredShown = true;
        set({ showExpiredModal: true });
        
        // Auto-close and redirect after 5 minutes of inactivity
        autoCloseTimeout = window.setTimeout(() => {
          this.hideExpiredModal();
          window.location.href = "/";
        }, 5 * 60 * 1000); // 5 minutes
      }
    },
    hideExpiredModal() {
      sessionExpiredShown = false;
      set({ showExpiredModal: false });
      
      // Clear auto-close timeout
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
        autoCloseTimeout = null;
      }
    },
    startPolling() {
      console.log("polling")
      // Poll every 30 seconds to check session validity
      if (pollingInterval) return; // Already polling

      pollingInterval = window.setInterval(async () => {
        try {
          const response = await fetch("/api/auth/me");
          if (response.status === 401 && !sessionExpiredShown) {
            this.showExpiredModal();
          }
        } catch (error) {
          // Network error - don't show modal
          console.error("Session check failed:", error);
        }
      }, 30000);
    },
    stopPolling() {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },
  };
}

export const sessionStore = createSessionStore();

// Global fetch interceptor to detect 401 errors
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);

  // Check if it's a 401 and not a login/register attempt
  if (response.status === 401) {
    const url = args[0] as string;
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/register") ||
      url.includes("/api/auth/me");

    // Only show modal for non-auth endpoints
    if (!isAuthEndpoint) {
      sessionStore.showExpiredModal();
    }
  }

  return response;
};
