<script lang="ts">
  import { authStore } from "../../stores/authStore";

  let display_name = $authStore?.display_name || $authStore?.username || "";
  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";

  let profileError = "";
  let profileSuccess = "";
  let passwordError = "";
  let passwordSuccess = "";
  let profileLoading = false;
  let passwordLoading = false;
  let showCurrentPassword = false;
  let showNewPassword = false;
  let showConfirmPassword = false;

  async function handleProfileUpdate(e: Event) {
    e.preventDefault();
    profileError = "";
    profileSuccess = "";
    profileLoading = true;

    try {
      await authStore.updateProfile(display_name);
      profileSuccess = "Profile updated successfully!";
      setTimeout(() => (profileSuccess = ""), 3000);
    } catch (e: any) {
      profileError = e.message;
    } finally {
      profileLoading = false;
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
  <h3>Your Name</h3>
  <form on:submit={handleProfileUpdate}>
    <div class="form-group">
      <label for="username">Username (Login)</label>
      <input
        id="username"
        type="text"
        value={$authStore?.username}
        disabled
        class="disabled-input"
      />
      <small>Your username cannot be changed</small>
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

  input:disabled,
  .disabled-input {
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

  .btn-primary {
    width: 100%;
    padding: 12px;
  }
</style>
