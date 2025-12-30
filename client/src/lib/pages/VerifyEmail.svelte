<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";

  let status: "loading" | "success" | "error" = "loading";
  let message = "";

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      status = "error";
      message = "No verification token provided.";
      return;
    }

    try {
      const response = await fetch(`/api/auth/verify/${token}`);
      const data = await response.json();

      if (response.ok) {
        status = "success";
        message = data.message || "Email verified successfully!";
      } else {
        status = "error";
        message = data.error || "Verification failed.";
      }
    } catch (e) {
      status = "error";
      message = "An error occurred during verification.";
    }
  });

  function goToLogin() {
    navigate("/");
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1 class="auth-title">🔮 Tarot Tracker</h1>
    <h2>Email Verification</h2>

    {#if status === "loading"}
      <div class="status-content">
        <div class="loading-spinner"></div>
        <p>Verifying your email...</p>
      </div>
    {:else if status === "success"}
      <div class="status-content">
        <div class="status-icon success">
          <span class="material-symbols-outlined"> done_outline </span>
        </div>
        <div class="message-box success">{message}</div>
        <button class="btn btn-primary" on:click={goToLogin}>
          Continue to Sign In
        </button>
      </div>
    {:else}
      <div class="status-content">
        <div class="status-icon error">
          <span class="material-symbols-outlined"> error </span>
        </div>
        <div class="message-box error">{message}</div>
        <button class="btn btn-primary" on:click={goToLogin}>
          Go to Sign In
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
    text-align: center;
  }

  .auth-title {
    margin: 0 0 10px 0;
    font-size: 2em;
  }

  h2 {
    margin: 0 0 25px 0;
    color: var(--color-text);
  }

  .status-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .status-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: bold;
  }

  .status-icon.success {
    background: #efe;
    color: #060;
    border: 2px solid #cfc;
  }

  .status-icon.error {
    background: #fee;
    color: #c00;
    border: 2px solid #fcc;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    margin-top: 10px;
  }

  .message-box {
    padding: 12px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    width: 100%;
    box-sizing: border-box;
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
