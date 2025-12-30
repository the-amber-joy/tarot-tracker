<script lang="ts">
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";

  let username = "";
  let password = "";
  let email = "";
  let error = "";
  let successMessage = "";
  let loading = false;
  let isRegisterMode = false;
  let showPassword = false;

  // For handling unverified login attempts
  let showResendOption = false;
  let unverifiedEmail = "";
  let resendLoading = false;

  async function handleSubmit() {
    error = "";
    successMessage = "";
    showResendOption = false;
    loading = true;

    try {
      if (isRegisterMode) {
        if (password.length < 6) {
          error = "Password must be at least 6 characters";
          loading = false;
          return;
        }
        const result = await authStore.register(username, password, email);
        if (result.requiresVerification) {
          successMessage = result.message;
          // Switch to login mode after successful registration
          isRegisterMode = false;
          username = "";
          password = "";
          email = "";
        }
      } else {
        await authStore.login(username, password);
      }
    } catch (e: any) {
      error = e.message;
      // Check if login failed due to unverified email
      if (e.requiresVerification && e.email) {
        showResendOption = true;
        unverifiedEmail = e.email;
      }
    } finally {
      loading = false;
    }
  }

  async function handleResendVerification() {
    resendLoading = true;
    error = "";

    try {
      const message = await authStore.resendVerification(unverifiedEmail);
      successMessage = message;
      showResendOption = false;
    } catch (e: any) {
      error = e.message;
    } finally {
      resendLoading = false;
    }
  }

  function toggleMode() {
    isRegisterMode = !isRegisterMode;
    error = "";
    successMessage = "";
    showPassword = false;
    showResendOption = false;
  }

  function goToForgotPassword() {
    navigate("/forgot-password");
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1 class="auth-title">🔮 Tarot Tracker</h1>
    <h2>{isRegisterMode ? "Create Account" : "Sign In"}</h2>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          placeholder="Enter username"
          disabled={loading}
          autocapitalize="none"
        />
      </div>

      {#if isRegisterMode}
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            placeholder="Enter email"
            disabled={loading}
            autocapitalize="none"
          />
          <small class="form-hint"
            >Used for account verification and password reset</small
          >
        </div>
      {/if}

      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            required
            placeholder={isRegisterMode
              ? "At least 6 characters"
              : "Enter password"}
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

      {#if error}
        <div class="message-box error">{error}</div>
      {/if}

      {#if successMessage}
        <div class="message-box success">{successMessage}</div>
      {/if}

      {#if showResendOption}
        <button
          type="button"
          class="btn btn-secondary resend-btn"
          on:click={handleResendVerification}
          disabled={resendLoading}
        >
          {resendLoading ? "Sending..." : "Resend Verification Email"}
        </button>
      {/if}

      <button type="submit" class="btn btn-primary" disabled={loading}>
        {#if loading}
          Loading...
        {:else}
          {isRegisterMode ? "Create Account" : "Sign In"}
        {/if}
      </button>

      {#if !isRegisterMode}
        <div class="forgot-password">
          <button
            type="button"
            class="link-button"
            on:click={goToForgotPassword}
            disabled={loading}
          >
            Forgot your password?
          </button>
        </div>
      {/if}

      <div class="toggle-mode">
        {isRegisterMode ? "Already have an account?" : "Don't have an account?"}
        <button
          type="button"
          class="link-button"
          on:click={toggleMode}
          disabled={loading}
        >
          {isRegisterMode ? "Sign In" : "Create Account"}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .form-hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .btn-secondary {
    width: 100%;
    padding: 10px;
    background: var(--color-bg-section);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 14px;
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg-hover);
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .resend-btn {
    margin-bottom: 15px;
  }

  .forgot-password {
    text-align: center;
    margin-top: 15px;
  }

  .toggle-mode {
    text-align: center;
    margin-top: 20px;
    color: var(--color-text-muted);
  }
</style>
