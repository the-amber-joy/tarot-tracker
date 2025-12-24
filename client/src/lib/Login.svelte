<script lang="ts">
  import { authStore } from "../stores/authStore";

  let username = "";
  let password = "";
  let error = "";
  let loading = false;
  let isRegisterMode = false;

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
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          placeholder={isRegisterMode ? "At least 6 characters" : "Enter password"}
          disabled={loading}
        />
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
