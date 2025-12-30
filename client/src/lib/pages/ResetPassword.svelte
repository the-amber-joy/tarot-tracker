<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";

  export let params: { token?: string } = {};

  let token = "";
  let newPassword = "";
  let confirmPassword = "";
  let error = "";
  let successMessage = "";
  let loading = false;
  let validatingToken = true;
  let tokenValid = false;
  let showPassword = false;
  let showConfirmPassword = false;

  onMount(async () => {
    // Get token from URL params or query string
    const urlParams = new URLSearchParams(window.location.search);
    token = params.token || urlParams.get("token") || "";

    if (!token) {
      error = "No reset token provided";
      validatingToken = false;
      return;
    }

    try {
      tokenValid = await authStore.validateResetToken(token);
      if (!tokenValid) {
        error = "This reset link is invalid or has expired.";
      }
    } catch (e: any) {
      error = e.message || "This reset link is invalid or has expired.";
    } finally {
      validatingToken = false;
    }
  });

  async function handleSubmit() {
    error = "";

    if (newPassword !== confirmPassword) {
      error = "Passwords do not match";
      return;
    }

    if (newPassword.length < 6) {
      error = "Password must be at least 6 characters";
      return;
    }

    loading = true;

    try {
      const message = await authStore.resetPassword(token, newPassword);
      successMessage = message;
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/"), 3000);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function goToLogin() {
    navigate("/");
  }

  function goToForgotPassword() {
    navigate("/forgot-password");
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1 class="auth-title">🔮 Tarot Tracker</h1>
    <h2>Reset Password</h2>

    {#if validatingToken}
      <div class="loading-state">
        <p>Validating reset link...</p>
      </div>
    {:else if successMessage}
      <div class="message-box success">{successMessage}</div>
      <p class="redirect-notice">Redirecting to login...</p>
      <button type="button" class="btn btn-primary" on:click={goToLogin}>
        Go to Login Now
      </button>
    {:else if tokenValid}
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="newPassword">New Password</label>
          <div class="password-input-wrapper">
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              bind:value={newPassword}
              required
              placeholder="At least 6 characters"
              disabled={loading}
            />
            <button
              type="button"
              class="password-toggle-btn"
              on:click={() => (showPassword = !showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              <span class="material-symbols-outlined">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <div class="password-input-wrapper">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              bind:value={confirmPassword}
              required
              placeholder="Re-enter new password"
              disabled={loading}
            />
            <button
              type="button"
              class="password-toggle-btn"
              on:click={() => (showConfirmPassword = !showConfirmPassword)}
              aria-label={showConfirmPassword
                ? "Hide password"
                : "Show password"}
              disabled={loading}
            >
              <span class="material-symbols-outlined">
                {showConfirmPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {#if error}
          <div class="message-box error">{error}</div>
        {/if}

        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    {:else}
      <div class="message-box error">{error}</div>
      <div class="action-buttons">
        <button
          type="button"
          class="btn btn-primary"
          on:click={goToForgotPassword}
        >
          Request New Reset Link
        </button>
        <button type="button" class="link-button" on:click={goToLogin}>
          ← Back to Sign In
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .loading-state {
    text-align: center;
    color: var(--color-text-muted);
    padding: 20px 0;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }

  .redirect-notice {
    text-align: center;
    color: var(--color-text-muted);
    margin-bottom: 15px;
    font-size: 14px;
  }
</style>
