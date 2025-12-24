<script lang="ts">
  import { onMount } from 'svelte';
  import { Route, Router, navigate } from 'svelte-routing';
  import Admin from './lib/Admin.svelte';
  import Header from './lib/Header.svelte';
  import Login from './lib/Login.svelte';
  import Profile from './lib/Profile.svelte';
  import ReadingDetail from './lib/ReadingDetail.svelte';
  import ReadingForm from './lib/ReadingForm.svelte';
  import ReadingsList from './lib/ReadingsList.svelte';
  import { authStore } from './stores/authStore';
  
  let formRef: any = null;
  let currentPath = '';
  let authInitialized = false;
  
  // Track if we're in form view for header
  $: isFormView = currentPath === '/reading/new' || currentPath.includes('/edit');
  $: isEditMode = currentPath.includes('/edit');
  $: isDetailView = currentPath.match(/^\/reading\/\d+$/) !== null;
  $: detailReadingId = isDetailView ? currentPath.match(/\d+/)?.[0] : null;
  
  onMount(async () => {
    // Initialize auth
    await authStore.init();
    authInitialized = true;

    // Initial path
    currentPath = window.location.pathname;
    
    // Listen for route changes
    const updatePath = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        currentPath = newPath;
      }
    };
    
    // Listen to popstate for back/forward button
    window.addEventListener('popstate', updatePath);
    
    // Poll for path changes (catches navigate() calls)
    const intervalId = setInterval(updatePath, 100);
    
    return () => {
      window.removeEventListener('popstate', updatePath);
      clearInterval(intervalId);
    };
  });
  
  function handleHeaderSave() {
    if (formRef) {
      formRef.triggerSubmit();
    }
  }
  
  function handleHeaderCancel() {
    navigate('/');
    setTimeout(() => currentPath = window.location.pathname, 0);
  }
  
  function handleHeaderEdit() {
    if (detailReadingId) {
      navigate(`/reading/${detailReadingId}/edit`);
      setTimeout(() => currentPath = window.location.pathname, 0);
    }
  }

</script>

{#if !authInitialized}
  <div class="loading">Loading...</div>
{:else if !$authStore}
  <Login />
{:else}
<Router>
  <div class="container">
    <Header 
      onHome={() => {
        navigate('/');
        setTimeout(() => currentPath = window.location.pathname, 0);
      }}
      onNewReading={() => {
        navigate('/reading/new');
        setTimeout(() => currentPath = window.location.pathname, 0);
      }}
      onSave={handleHeaderSave}
      onCancel={handleHeaderCancel}
      onEdit={handleHeaderEdit}
      {isFormView}
      {isEditMode}
      {isDetailView}
    />

    <Route path="/">
      <ReadingsList />
    </Route>
    <Route path="/profile">
      <Profile />
    </Route>
    <Route path="/admin">
      <Admin />
    </Route>
    <Route path="/reading/new">
      <ReadingForm bind:this={formRef} />
    </Route>
    <Route path="/reading/:id" let:params>
      <ReadingDetail {params} />
    </Route>
    <Route path="/reading/:id/edit" let:params>
      <ReadingForm {params} bind:this={formRef} />
    </Route>
  </div>
</Router>
{/if}

<style>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.2rem;
    color: #666;
  }
</style>
