<script>
  import { onMount } from 'svelte'
  import { getPaste, getPasteRaw, getPasteHistory } from '../services/api'
  import { processContent } from '../services/processors'
  import { showToast } from '../stores/toastStore'
  import MonacoEditor from './MonacoEditor.svelte'

  export let pasteId = ''

  let paste = null
  let processed = null
  let loading = true
  let history = []
  let showHistory = false

  async function loadPaste(id) {
    if (!id) return
    loading = true
    paste = null
    processed = null
    history = []

    console.log('[PasteViewer] Loading paste:', id)

    try {
      console.log('[PasteViewer] Fetching paste metadata...')
      const pasteResponse = await getPaste(id)
      console.log('[PasteViewer] Paste metadata received:', pasteResponse.data)
      paste = pasteResponse.data

      // Fetch and process raw content
      console.log('[PasteViewer] Fetching raw content...')
      const rawResponse = await getPasteRaw(id)
      const content = await rawResponse.data.arrayBuffer()
      console.log('[PasteViewer] Raw content received, processing...')

      processed = processContent(
        new Uint8Array(content),
        paste.content_type,
        paste.language_hint
      )
      console.log('[PasteViewer] Content processed:', processed)

      // Load history if this is part of a version chain
      if (paste.root_id) {
        console.log('[PasteViewer] Loading history...')
        const historyResponse = await getPasteHistory(id)
        history = historyResponse.data.versions
      }
      console.log('[PasteViewer] Paste loaded successfully')
    } catch (error) {
      console.error('[PasteViewer] Error loading paste:', error)
      showToast('Failed to load paste: ' + error.message, 'error')
    } finally {
      loading = false
    }
  }

  $: if (pasteId) {
    loadPaste(pasteId)
  }

  onMount(() => {
    if (pasteId) {
      loadPaste(pasteId)
    }
  })

  function downloadPaste() {
    const element = document.createElement('a')
    element.setAttribute('href', `/${pasteId}/raw`)
    element.setAttribute('download', paste.name || pasteId)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  function navigateToPaste(newId) {
    window.history.pushState({}, '', `/${newId}`)
    window.dispatchEvent(new PopStateEvent('popstate', {}))
    // Update current paste ID
    pasteId = newId
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <i class="fas fa-spinner fa-spin text-blue-600 text-4xl"></i>
  </div>
{:else if paste}
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6">
      <div class="px-6 py-4">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">{paste.name || 'Untitled'}</h1>
            {#if paste.description}
              <p class="text-gray-600">{paste.description}</p>
            {/if}
          </div>
          <button
            on:click={downloadPaste}
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <i class="fas fa-download mr-2"></i>
            Download
          </button>
        </div>

        <!-- Metadata -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Type:</span>
            <span class="block font-mono text-gray-900">{paste.content_type}</span>
          </div>
          <div>
            <span class="text-gray-500">Size:</span>
            <span class="block font-mono text-gray-900">{formatFileSize(paste.size_bytes)}</span>
          </div>
          <div>
            <span class="text-gray-500">Views:</span>
            <span class="block font-mono text-gray-900">{paste.access_count}</span>
          </div>
          <div>
            <span class="text-gray-500">Version:</span>
            <span class="block font-mono text-gray-900">v{paste.version_number}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    {#if processed}
      {#if processed.type === 'markdown'}
        <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6 p-6 prose prose-sm max-w-none">
          {@html processed.html}
        </div>
      {:else if processed.type === 'code'}
        <MonacoEditor
          value={processed.preview || ''}
          language={processed.metadata?.language || 'plaintext'}
          readOnly={true}
          height="calc(100vh - 300px)"
        />
      {:else if processed.type === 'text'}
        <MonacoEditor
          value={processed.preview || ''}
          language="plaintext"
          readOnly={true}
          height="calc(100vh - 300px)"
        />
        {#if processed.truncated}
          <div class="bg-blue-50 border-t border-gray-200 px-6 py-4 text-center text-sm text-blue-700 mb-6 rounded-b-lg">
            Content truncated. <a href="/{pasteId}/raw" class="font-semibold hover:underline">Download full file</a>
          </div>
        {/if}
      {:else if processed.type === 'image'}
        <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6 p-6">
          <img src={processed.url} alt={paste.name} class="max-w-full h-auto rounded" />
        </div>
      {:else if processed.type === 'csv'}
        <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6 p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="px-4 py-2 text-left font-semibold text-gray-900">Row</th>
                  {#each processed.metadata.columns as col}
                    <th class="px-4 py-2 text-left font-semibold text-gray-900">{col}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each processed.rows as row, idx}
                  <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="px-4 py-2 text-gray-600">{idx + 1}</td>
                    {#each processed.metadata.columns as col}
                      <td class="px-4 py-2 text-gray-900">{row[col] || ''}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6 p-6 text-center">
          <i class="fas fa-file text-gray-400 text-6xl mb-4"></i>
          <p class="text-gray-600 mb-4">Preview not available for this file type</p>
          <button
            on:click={downloadPaste}
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <i class="fas fa-download mr-2"></i>
            Download File
          </button>
        </div>
      {/if}
    {:else}
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6 p-6 text-center">
        <i class="fas fa-file text-gray-400 text-6xl mb-4"></i>
        <p class="text-gray-600">Loading preview...</p>
      </div>
    {/if}

    <!-- History -->
    {#if history.length > 0}
      <div class="bg-white shadow-sm rounded-lg border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <button
            on:click={() => (showHistory = !showHistory)}
            class="flex items-center text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            <i class="fas fa-code-branch mr-2"></i>
            Version History
            <i class="fas fa-chevron-down ml-2 transition-transform" class:rotate-180={showHistory}></i>
          </button>
        </div>
        {#if showHistory}
          <div class="divide-y divide-gray-200">
            {#each history as version (version.id)}
              <button
                on:click={() => navigateToPaste(version.id)}
                class="w-full p-4 hover:bg-gray-50 transition-colors block text-left border-0 bg-transparent cursor-pointer"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-medium text-gray-900">v{version.version}</span>
                    <span class="text-sm text-gray-500 ml-2">{version.name || 'Untitled'}</span>
                  </div>
                  <span class="text-sm text-gray-500">{new Date(version.created_at).toLocaleString()}</span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <div class="flex items-center justify-center py-12">
    <div class="text-center">
      <i class="fas fa-search text-gray-400 text-6xl mb-4"></i>
      <p class="text-gray-600">Paste not found</p>
    </div>
  </div>
{/if}
