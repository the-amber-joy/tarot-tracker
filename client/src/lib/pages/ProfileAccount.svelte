<script lang="ts">
  import { onMount } from "svelte";
  import { authStore } from "../../stores/authStore";

  let display_name = $authStore?.display_name || $authStore?.username || "";
  let username = $authStore?.username || "";
  let newEmail = $authStore?.email || "";
  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";

  let profileError = "";
  let profileSuccess = "";
  let emailError = "";
  let emailSuccess = "";
  let passwordError = "";
  let passwordSuccess = "";
  let profileLoading = false;
  let emailLoading = false;
  let passwordLoading = false;
  let showCurrentPassword = false;
  let showNewPassword = false;
  let showConfirmPassword = false;

  // Refresh user data on mount to catch any changes (e.g., admin verified email)
  onMount(() => {
    authStore.refresh();
  });

  // Reactive check if email has changed
  $: emailChanged =
    newEmail.toLowerCase().trim() !== ($authStore?.email || "").toLowerCase();

  async function handleProfileUpdate(e: Event) {
    e.preventDefault();
    profileError = "";
    profileSuccess = "";
    profileLoading = true;

    try {
      await authStore.updateProfile(display_name, username);
      profileSuccess = "Profile updated successfully!";
      setTimeout(() => (profileSuccess = ""), 3000);
    } catch (e: any) {
      profileError = e.message;
    } finally {
      profileLoading = false;
    }
  }

  async function handleEmailUpdate(e: Event) {
    e.preventDefault();
    emailError = "";
    emailSuccess = "";

    if (!newEmail.trim()) {
      emailError = "Email is required";
      return;
    }

    emailLoading = true;

    try {
      const result = await authStore.updateEmail(newEmail.trim());
      emailSuccess = result.message;
    } catch (e: any) {
      emailError = e.message;
    } finally {
      emailLoading = false;
    }
  }

  async function handleResendVerification() {
    emailError = "";
    emailSuccess = "";
    emailLoading = true;

    try {
      const message = await authStore.resendVerification(
        $authStore?.email || "",
      );
      emailSuccess = message;
    } catch (e: any) {
      emailError = e.message;
    } finally {
      emailLoading = false;
    }
  }

  async function handlePasswordUpdate(e: Event) {
    e.preventDefault();
    passwordError = "";
    passwordSuccess = "";

    if (newPassword !== confirmPassword) {
      passwordError = "New passwords do not match";
      return;
    }

    if (newPassword.length < 6) {
      passwordError = "Password must be at least 6 characters";
      return;
    }

    passwordLoading = true;

    try {
      await authStore.updatePassword(currentPassword, newPassword);
      passwordSuccess = "Password updated successfully!";
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
      setTimeout(() => (passwordSuccess = ""), 3000);
    } catch (e: any) {
      passwordError = e.message;
    } finally {
      passwordLoading = false;
    }
  }
</script>

<section class="profile-section">
  <h3>Email Address</h3>
  <div class="email-header">
    <p class="current-email">{$authStore?.email}</p>
    <div class="email-status">
      {#if $authStore?.email_verified}
        <span class="status-badge verified">
          <span class="material-symbols-outlined">verified</span>
          Verified
        </span>
      {:else}
        <span class="status-badge unverified">
          <span class="material-symbols-outlined">warning</span>
          Not Verified
        </span>
      {/if}
    </div>
  </div>

  {#if !$authStore?.email_verified}
    <div class="warning-box">
      {#if !$authStore?.email}
        <strong>⚠️ No email provided:</strong> You won't be able to reset a forgotten
        password until you add and verify an email address.
      {:else}
        <strong>⚠️ Email not verified:</strong> You won't be able to reset a forgotten
        password until you verify your email address.
      {/if}
    </div>
  {/if}

  <form on:submit={handleEmailUpdate}>
    <div class="form-group">
      <label for="email">Update Email</label>
      <input
        id="email"
        type="email"
        bind:value={newEmail}
        required
        placeholder="Enter new email address"
        disabled={emailLoading}
      />
      {#if emailChanged}
        <small class="email-warning">
          Changing your email will require re-verification. Until verified, you
          won't be able to reset a forgotten password.
        </small>
      {:else}
        <small>Used for password resets and account recovery</small>
      {/if}
    </div>

    {#if emailError}
      <div class="message-box error">{emailError}</div>
    {/if}

    {#if emailSuccess}
      <div class="message-box success">{emailSuccess}</div>
    {/if}

    <div class="email-actions">
      {#if emailChanged}
        <button type="submit" class="btn btn-primary" disabled={emailLoading}>
          {emailLoading ? "Updating..." : "Update Email"}
        </button>
      {/if}

      {#if !$authStore?.email_verified && !emailChanged}
        <button
          type="button"
          class="btn btn-secondary"
          on:click={handleResendVerification}
          disabled={emailLoading}
        >
          {emailLoading
            ? "Sending..."
            : $authStore?.email
              ? "Resend Verification Email"
              : "Send Verification Email"}
        </button>
      {/if}
    </div>
  </form>
</section>

<section class="profile-section">
  <h3>Your Profile</h3>
  <form on:submit={handleProfileUpdate}>
    <div class="form-group">
      <label for="username">Username (Login)</label>
      <input
        id="username"
        type="text"
        bind:value={username}
        required
        placeholder="Enter username"
        disabled={profileLoading}
      />
      <small>This is what you use to sign in</small>
    </div>

    <div class="form-group">
      <label for="display_name">Display Name</label>
      <input
        id="display_name"
        type="text"
        bind:value={display_name}
        required
        placeholder="Enter display name"
        disabled={profileLoading}
      />
      <small>This is how your name will appear in the app</small>
    </div>

    {#if profileError}
      <div class="message-box error">{profileError}</div>
    {/if}

    {#if profileSuccess}
      <div class="message-box success">{profileSuccess}</div>
    {/if}

    <button type="submit" class="btn btn-primary" disabled={profileLoading}>
      {profileLoading ? "Saving..." : "Save Profile"}
    </button>
  </form>
</section>

<section class="profile-section">
  <h3>Change Password</h3>
  <form on:submit={handlePasswordUpdate}>
    <div class="form-group">
      <label for="currentPassword">Current Password</label>
      <div class="password-input-wrapper">
        <input
          id="currentPassword"
          type={showCurrentPassword ? "text" : "password"}
          bind:value={currentPassword}
          required
          placeholder="Enter current password"
          disabled={passwordLoading}
        />
        <button
          type="button"
          class="password-toggle-btn"
          on:click={() => (showCurrentPassword = !showCurrentPassword)}
          aria-label={showCurrentPassword ? "Hide password" : "Show password"}
          disabled={passwordLoading}
        >
          <span class="material-symbols-outlined">
            {showCurrentPassword ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </div>

    <div class="form-group">
      <label for="newPassword">New Password</label>
      <div class="password-input-wrapper">
        <input
          id="newPassword"
          type={showNewPassword ? "text" : "password"}
          bind:value={newPassword}
          required
          placeholder="At least 6 characters"
          disabled={passwordLoading}
        />
        <button
          type="button"
          class="password-toggle-btn"
          on:click={() => (showNewPassword = !showNewPassword)}
          aria-label={showNewPassword ? "Hide password" : "Show password"}
          disabled={passwordLoading}
        >
          <span class="material-symbols-outlined">
            {showNewPassword ? "visibility_off" : "visibility"}
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
          disabled={passwordLoading}
        />
        <button
          type="button"
          class="password-toggle-btn"
          on:click={() => (showConfirmPassword = !showConfirmPassword)}
          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          disabled={passwordLoading}
        >
          <span class="material-symbols-outlined">
            {showConfirmPassword ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </div>

    {#if passwordError}
      <div class="message-box error">{passwordError}</div>
    {/if}

    {#if passwordSuccess}
      <div class="message-box success">{passwordSuccess}</div>
    {/if}

    <button type="submit" class="btn btn-primary" disabled={passwordLoading}>
      {passwordLoading ? "Updating..." : "Update Password"}
    </button>
  </form>
</section>

<style>
  .profile-section {
    background: var(--color-bg-section);
    padding: 1rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    margin-bottom: 2rem;
  }

  .profile-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.4rem;
    color: var(--color-text-secondary);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  input:disabled {
    background-color: var(--color-bg-disabled);
    cursor: not-allowed;
    color: var(--color-secondary);
  }

  .password-input-wrapper input[type="text"] {
    font-family: ui-monospace, "Cascadia Code", "Courier New", Courier,
      monospace;
    letter-spacing: 0.05em;
    height: 42px;
    line-height: 1.5;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
  }

  .email-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .current-email {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0;
    color: var(--color-text);
  }

  .email-status {
    flex-shrink: 0;
  }

  @media (max-width: 500px) {
    .email-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-pill);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .status-badge .material-symbols-outlined {
    font-size: 1.1rem;
  }

  .status-badge.verified {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .status-badge.unverified {
    background: var(--color-error-bg);
    color: var(--color-error-text);
  }

  .warning-box {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 1rem;
    border-radius: var(--radius-md);
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .email-warning {
    color: var(--color-warning-hover);
    font-weight: 500;
  }

  .email-actions {
    display: flex;
    gap: 1rem;
  }

  .email-actions .btn {
    flex: 1;
  }

  .btn-secondary {
    background: var(--color-bg-section);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    padding: 12px;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: var(--transition-fast);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg-hover);
    border-color: var(--color-text-secondary);
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
  }
</style>
