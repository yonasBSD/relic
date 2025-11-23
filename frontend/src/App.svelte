<script>
  import { onMount } from 'svelte'
  import Navigation from './components/Navigation.svelte'
  import HeroSection from './components/HeroSection.svelte'
  import PasteForm from './components/PasteForm.svelte'
  import PasteViewer from './components/PasteViewer.svelte'
  import RecentPastes from './components/RecentPastes.svelte'
  import MyPastes from './components/MyPastes.svelte'
  import ApiDocs from './components/ApiDocs.svelte'
  import Toast from './components/Toast.svelte'
  import { toastStore } from './stores/toastStore'

  let currentUser = null
  let currentSection = 'new'
  let currentPasteId = null

  function updateRouting() {
    const path = window.location.pathname
    const parts = path.split('/').filter(p => p)

    console.log('[App] Route update - path:', path, 'parts:', parts)

    if (parts.length === 1 && parts[0] && parts[0] !== 'api' && parts[0] !== 'recent' && parts[0] !== 'my-pastes' && parts[0] !== 'new') {
      // This looks like a paste ID
      console.log('[App] Detected paste ID:', parts[0])
      currentPasteId = parts[0]
      currentSection = 'paste'
    } else if (parts.length === 0) {
      console.log('[App] Navigating to home')
      currentSection = 'new'
      currentPasteId = null
    } else {
      console.log('[App] Navigating to section:', parts[0])
      currentSection = parts[0]
      currentPasteId = null
    }

    console.log('[App] Routing result - section:', currentSection, 'pasteId:', currentPasteId)
  }

  onMount(() => {
    // Initial routing on page load
    updateRouting()

    // Listen for popstate to handle browser back/forward
    window.addEventListener('popstate', updateRouting)
    return () => window.removeEventListener('popstate', updateRouting)
  })

  function handleNavigation(section) {
    currentSection = section
    currentPasteId = null

    if (section === 'new') {
      window.history.pushState({}, '', '/')
    } else {
      window.history.pushState({}, '', `/${section}`)
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Navigation {currentUser} on:navigate={(e) => handleNavigation(e.detail.section)} />

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    {#if currentSection === 'paste' && currentPasteId}
      <PasteViewer pasteId={currentPasteId} />
    {:else if currentSection === 'new' || currentSection === 'default' || currentSection === ''}
      <HeroSection />
      <PasteForm />
    {:else if currentSection === 'recent'}
      <RecentPastes />
    {:else if currentSection === 'my-pastes'}
      <MyPastes {currentUser} />
    {:else if currentSection === 'api'}
      <ApiDocs />
    {/if}
  </main>

  <Toast />
</div>

<style global>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
</style>
