import { writable } from "svelte/store";

type User = {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  is_admin?: boolean;
} | null;

function createAuthStore() {
  const { subscribe, set } = writable<User>(null);
  let initialized = false;

  return {
    subscribe,
    async init() {
      if (initialized) return;

      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const user = await response.json();
          set(user);
        } else {
          set(null);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        set(null);
      }
      initialized = true;
    },
    async login(username: string, password: string) {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const user = await response.json();
      set(user);
      return user;
    },
    async register(username: string, password: string, email?: string) {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }

      const user = await response.json();
      set(user);
      return user;
    },
    async updateProfile(display_name: string, email?: string) {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name, email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Profile update failed");
      }

      const user = await response.json();
      set(user);
      return user;
    },
    async updatePassword(currentPassword: string, newPassword: string) {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Password update failed");
      }

      return await response.json();
    },
    async logout() {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      set(null);
      // Force reload to clear all state
      window.location.href = "/";
    },
  };
}

export const authStore = createAuthStore();
