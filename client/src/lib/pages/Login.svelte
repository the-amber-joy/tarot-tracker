<script lang="ts">
  import { authStore } from "../../stores/authStore";

  let username = "";
  let password = "";
  let error = "";
  let loading = false;
  let isRegisterMode = false;
  let showPassword = false;

  async function handleSubmit() {
    error = "";
    loading = true;

    try {
      if (isRegisterMode) {
        if (password.length < 6) {
          error = "Password must be at least 6 characters";
          loading = false;
          return;
        }
        await authStore.register(username, password);
      } else {
        await authStore.login(username, password);
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function toggleMode() {
    isRegisterMode = !isRegisterMode;
    error = "";
    showPassword = false;
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

      <button type="submit" class="btn btn-primary" disabled={loading}>
        {#if loading}
          Loading...
        {:else}
          {isRegisterMode ? "Create Account" : "Sign In"}
        {/if}
      </button>

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
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 20px;
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
    margin: 0 0 30px 0;
    color: var(--color-text);
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

  /* Using global .password-input-wrapper and .password-toggle-btn from app.css */

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

  /* Password toggle styles now in app.css - removed duplicate */

  /* Using global .btn and .btn-primary from app.css */
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

  .toggle-mode {
    text-align: center;
    margin-top: 20px;
    color: var(--color-text-muted);
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

  .link-button:hover:not(:disabled) {
    color: var(--color-primary-hover);
  }

  .link-button:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
</style>
