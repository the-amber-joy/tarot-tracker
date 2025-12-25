<script lang="ts">
  import { authStore } from "../stores/authStore";

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
            placeholder={isRegisterMode ? "At least 6 characters" : "Enter password"}
            disabled={loading}
          />
          <button 
            type="button" 
            class="password-toggle-btn"
            on:click={() => showPassword = !showPassword}
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
        <div class="error-message">{error}</div>
      {/if}

      <button type="submit" class="btn-primary" disabled={loading}>
        {#if loading}
          Loading...
        {:else}
          {isRegisterMode ? "Create Account" : "Sign In"}
        {/if}
      </button>

      <div class="toggle-mode">
        {isRegisterMode ? "Already have an account?" : "Don't have an account?"}
        <button type="button" class="link-button" on:click={toggleMode} disabled={loading}>
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
    background: white;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
    color: #333;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #555;
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #4a90e2;
  }

  input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .password-toggle-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.2rem;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .password-toggle-btn:hover:not(:disabled) {
    opacity: 1;
  }

  .password-toggle-btn:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #357abd;
  }

  .btn-primary:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .password-input-wrapper input {
    font-family: ui-monospace, 'Cascadia Code', 'Courier New', Courier, monospace;
    letter-spacing: 0.05em;
    height: 42px;
    line-height: 1.5;
  }

  .error-message {
    background-color: #fee;
    color: #c33;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 14px;
  }

  .toggle-mode {
    text-align: center;
    margin-top: 20px;
    color: #666;
  }

  .link-button {
    background: none;
    border: none;
    color: #4a90e2;
    cursor: pointer;
    text-decoration: underline;
    font-size: inherit;
    padding: 0 5px;
  }

  .link-button:hover:not(:disabled) {
    color: #357abd;
  }

  .link-button:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
</style>
