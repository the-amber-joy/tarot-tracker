<script lang="ts">
  import { navigate } from "svelte-routing";
  import { authStore } from "../stores/authStore";

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

  async function handleProfileUpdate(e: Event) {
    e.preventDefault();
    profileError = "";
    profileSuccess = "";
    profileLoading = true;

    try {
      await authStore.updateProfile(display_name);
      profileSuccess = "Profile updated successfully!";
      setTimeout(() => profileSuccess = "", 3000);
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
      setTimeout(() => passwordSuccess = "", 3000);
    } catch (e: any) {
      passwordError = e.message;
    } finally {
      passwordLoading = false;
    }
  }

  function goBack() {
    navigate("/");
  }
</script>

<div class="profile-container">
  <div class="profile-header">
    <button class="back-button" on:click={goBack}>← Back</button>
    <h2>Profile Settings</h2>
  </div>

  <div class="profile-content">
    <!-- Profile Information Section -->
    <section class="profile-section">
      <h3>Profile Information</h3>
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
          <div class="error-message">{profileError}</div>
        {/if}

        {#if profileSuccess}
          <div class="success-message">{profileSuccess}</div>
        {/if}

        <button type="submit" class="btn-primary" disabled={profileLoading}>
          {profileLoading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>

    <!-- Password Change Section -->
    <section class="profile-section">
      <h3>Change Password</h3>
      <form on:submit={handlePasswordUpdate}>
        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            bind:value={currentPassword}
            required
            placeholder="Enter current password"
            disabled={passwordLoading}
          />
        </div>

        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            bind:value={newPassword}
            required
            placeholder="At least 6 characters"
            disabled={passwordLoading}
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            required
            placeholder="Re-enter new password"
            disabled={passwordLoading}
          />
        </div>

        {#if passwordError}
          <div class="error-message">{passwordError}</div>
        {/if}

        {#if passwordSuccess}
          <div class="success-message">{passwordSuccess}</div>
        {/if}

        <button type="submit" class="btn-primary" disabled={passwordLoading}>
          {passwordLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </section>
  </div>
</div>

<style>
  .profile-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .profile-header {
    margin-bottom: 2rem;
  }

  .back-button {
    background: none;
    border: none;
    color: #4a90e2;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.5rem 0;
    margin-bottom: 1rem;
    display: inline-block;
  }

  .back-button:hover {
    text-decoration: underline;
  }

  .profile-header h2 {
    margin: 0;
    font-size: 2rem;
    color: #333;
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-section {
    background: #f9f9f9;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .profile-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.4rem;
    color: #555;
    border-bottom: 2px solid #ddd;
    padding-bottom: 0.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
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

  input:disabled,
  .disabled-input {
    background-color: #e9ecef;
    cursor: not-allowed;
    color: #6c757d;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #6c757d;
    font-size: 0.875rem;
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

  .success-message {
    background-color: #d4edda;
    color: #155724;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .profile-container {
      padding: 1rem;
    }

    .profile-section {
      padding: 1.5rem;
    }

    .profile-header h2 {
      font-size: 1.5rem;
    }
  }
</style>
