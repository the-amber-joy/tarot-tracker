import { writable } from "svelte/store";

type Reading = {
  id: number;
  date: string;
  time: string;
  title: string;
  spread_template_id?: string;
  deck_name: string;
  is_incomplete?: boolean;
};

function createReadingsStore() {
  const { subscribe, set } = writable<Reading[]>([]);
  let loaded = false;

  return {
    subscribe,
    async load() {
      if (loaded) return; // Don't reload if already loaded

      try {
        const response = await fetch("/api/readings");
        const data = await response.json();
        set(data);
        loaded = true;
      } catch (error) {
        console.error("Error loading readings:", error);
      }
    },
    refresh: async () => {
      loaded = false; // Force reload
      try {
        const response = await fetch("/api/readings");
        const data = await response.json();
        set(data);
        loaded = true;
      } catch (error) {
        console.error("Error loading readings:", error);
      }
    },
  };
}

export const readingsStore = createReadingsStore();
