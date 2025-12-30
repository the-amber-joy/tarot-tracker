import { writable } from "svelte/store";

function createAdminStore() {
  const { subscribe, set, update } = writable(0);

  return {
    subscribe,
    async fetchUnverifiedCount() {
      try {
        const response = await fetch("/api/admin/unverified-count");
        if (response.ok) {
          const data = await response.json();
          set(data.count);
        }
      } catch (error) {
        console.error("Failed to fetch unverified count:", error);
      }
    },
    decrement() {
      // Called when a user is verified to update the count immediately
      update((count) => Math.max(0, count - 1));
    },
    reset() {
      set(0);
    },
  };
}

export const unverifiedCountStore = createAdminStore();
