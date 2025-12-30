<script lang="ts">
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";

  let email = "";
  let error = "";
  let successMessage = "";
  let loading = false;

  async function handleSubmit() {
    error = "";
    successMessage = "";
    loading = true;

    try {
      const message = await authStore.forgotPassword(email);
      successMessage = message;
      email = "";
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function goToLogin() {
    navigate("/");
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1 class="auth-title">🔮 Tarot Tracker</h1>
    <h2>Forgot Password</h2>

    <p class="description">
      Enter your email address and we'll send you a link to reset your password.
    </p>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          placeholder="Enter your email"
          disabled={loading}
          autocapitalize="none"
        />
      </div>

      {#if error}
        <div class="message-box error">{error}</div>
      {/if}

      {#if successMessage}
        <div class="message-box success">{successMessage}</div>
      {/if}

      <button type="submit" class="btn btn-primary" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Link"}
      </button>

      <div class="back-to-login">
        <button type="button" class="link-button" on:click={goToLogin}>
          ← Back to Sign In
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
    margin: 0 0 15px 0;
    color: var(--color-text);
  }

  .description {
    text-align: center;
    color: var(--color-text-muted);
    margin-bottom: 25px;
    font-size: 14px;
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

  .back-to-login {
    text-align: center;
    margin-top: 20px;
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
