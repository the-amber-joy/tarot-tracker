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
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 40px);
    min-height: calc(100dvh - 40px);
    padding: 20px;
    box-sizing: border-box;
  }

  .auth-card {
    background: var(--color-bg-white);
    padding: 40px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    width: 100%;
    max-width: 400px;
  }

  .auth-title {
    text-align: center;
    margin: 0 0 10px 0;
    font-size: 2em;
  }

  h2 {
    text-align: center;
    margin: 0 0 25px 0;
    color: var(--color-text);
  }

  .loading-state {
    text-align: center;
    color: var(--color-text-muted);
    padding: 20px 0;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-sm);
    font-size: 14px;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  input:disabled {
    background-color: var(--color-gray-100);
    cursor: not-allowed;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
  }

  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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

  .link-button {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    text-decoration: underline;
    font-size: inherit;
    padding: 0 5px;
  }

  .link-button:hover {
    color: var(--color-primary-hover);
  }

  .message-box {
    padding: 12px;
    border-radius: var(--radius-sm);
    margin-bottom: 15px;
    font-size: 14px;
  }

  .message-box.error {
    background: #fee;
    color: #c00;
    border: 1px solid #fcc;
  }

  .message-box.success {
    background: #efe;
    color: #060;
    border: 1px solid #cfc;
  }
</style>
