import { writable } from "svelte/store";

type User = {
  id: number;
  username: string;
  email?: string;
  email_verified?: boolean;
  display_name?: string;
  is_admin?: boolean;
} | null;

type RegisterResult = {
  requiresVerification: boolean;
  message: string;
};

type LoginError = {
  requiresVerification?: boolean;
  email?: string;
  message: string;
};

function createAuthStore() {
  const { subscribe, set } = writable<User>(null);
  let initialized = false;

  async function fetchUser() {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const user = await response.json();
        set(user);
        return user;
      } else {
        set(null);
        return null;
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      set(null);
      return null;
    }
  }

  return {
    subscribe,
    async init() {
      if (initialized) return;
      await fetchUser();
      initialized = true;
    },
    async refresh() {
      // Force refresh user data (bypasses initialized check)
      return await fetchUser();
    },
    async login(username: string, password: string) {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          const error: LoginError = {
            message: data.error || "Login failed",
            requiresVerification: data.requiresVerification,
            email: data.email,
          };
          throw error;
        }

        set(data);
        return data;
      } catch (error: any) {
        if (error.message === "Failed to fetch" || !navigator.onLine) {
          throw {
            message: "Cannot connect to server. Please check your connection.",
          };
        }
        throw error;
      }
    },
    async register(
      username: string,
      password: string,
      email: string,
    ): Promise<RegisterResult> {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw { message: data.error || "Registration failed" };
        }

        // New registration flow - don't set user, return result
        return {
          requiresVerification: data.requiresVerification || false,
          message: data.message || "Registration successful",
        };
      } catch (error: any) {
        if (error.message === "Failed to fetch" || !navigator.onLine) {
          throw {
            message: "Cannot connect to server. Please check your connection.",
          };
        }
        throw error;
      }
    },
    async resendVerification(email: string): Promise<string> {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If already verified, refresh user data to update the UI
        if (data.error === "Email is already verified") {
          await fetchUser();
        }
        throw {
          message: data.error || "Failed to resend verification",
          waitMinutes: data.waitMinutes,
        };
      }

      return data.message;
    },
    async forgotPassword(email: string): Promise<string> {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw { message: data.error || "Failed to process request" };
      }

      return data.message;
    },
    async validateResetToken(token: string): Promise<boolean> {
      const response = await fetch(`/api/auth/validate-reset-token/${token}`);
      const data = await response.json();
      return data.valid === true;
    },
    async resetPassword(token: string, newPassword: string): Promise<string> {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw { message: data.error || "Failed to reset password" };
      }

      return data.message;
    },
    async updateProfile(display_name: string, username?: string) {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name, username }),
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
    async updateEmail(email: string) {
      const response = await fetch("/api/auth/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Email update failed");
      }

      const data = await response.json();
      // Server returns full user object, set it directly
      set({
        id: data.id,
        username: data.username,
        email: data.email,
        email_verified: data.email_verified,
        display_name: data.display_name,
        is_admin: data.is_admin,
      });
      return data;
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
