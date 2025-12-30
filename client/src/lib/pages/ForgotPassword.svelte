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
  .description {
    text-align: center;
    color: var(--color-text-muted);
    margin-bottom: 25px;
    font-size: 14px;
  }

  .back-to-login {
    text-align: center;
    margin-top: 20px;
  }
</style>
