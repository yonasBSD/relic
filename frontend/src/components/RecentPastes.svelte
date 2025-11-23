<script>
  import { onMount } from 'svelte'
  import { listPastes, getPasteRaw } from '../services/api'
  import { showToast } from '../stores/toastStore'

  let pastes = []
  let loading = true
  let searchTerm = ''

  onMount(async () => {
    try {
      const response = await listPastes()
      pastes = response.data.pastes || []
    } catch (error) {
      showToast('Failed to load recent pastes', 'error')
      console.error('Error loading pastes:', error)
    } finally {
      loading = false
    }
  })

  function formatTimeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  function getStatusPill(visibility) {
    const statusClass = visibility === 'public' ? 'status-public' :
                       visibility === 'private' ? 'status-private' : 'status-unlisted'
    const statusText = visibility.charAt(0).toUpperCase() + visibility.slice(1)
    return `<span class="status-pill ${statusClass}">${statusText}</span>`
  }

  function getTypeLabel(contentType) {
    if (!contentType) return 'Text'
    if (contentType.includes('javascript')) return 'JavaScript'
    if (contentType.includes('python')) return 'Python'
    if (contentType.includes('html')) return 'HTML'
    if (contentType.includes('css')) return 'CSS'
    if (contentType.includes('json')) return 'JSON'
    if (contentType.includes('markdown')) return 'Markdown'
    if (contentType.includes('xml')) return 'XML'
    if (contentType.includes('bash') || contentType.includes('shell')) return 'Bash'
    if (contentType.includes('sql')) return 'SQL'
    if (contentType.includes('java')) return 'Java'
    return 'Text'
  }

  function getFileExtension(contentType) {
    if (!contentType) return 'txt'

    const extensionMap = {
      'text/plain': 'txt',
      'text/markdown': 'md',
      'text/html': 'html',
      'text/css': 'css',
      'text/javascript': 'js',
      'application/javascript': 'js',
      'text/x-javascript': 'js',
      'application/json': 'json',
      'text/xml': 'xml',
      'application/xml': 'xml',
      'text/x-python': 'py',
      'application/x-python': 'py',
      'text/x-shellscript': 'sh',
      'application/x-sh': 'sh',
      'application/sql': 'sql',
      'text/x-java-source': 'java',
      'text/x-java': 'java',
      'application/java': 'java',
      'text/csv': 'csv',
      'application/csv': 'csv',
      'text/yaml': 'yml',
      'application/x-yaml': 'yml',
      'text/x-yaml': 'yml',
      'application/xml+xslt': 'xsl',
      'text/x-less': 'less',
      'text/x-scss': 'scss',
      'text/x-typescript': 'ts',
      'application/typescript': 'ts',
      'application/tsx': 'tsx',
      'application/jsx': 'jsx',
      'text/php': 'php',
      'application/php': 'php',
      'text/x-c': 'c',
      'text/x-c++': 'cpp',
      'text/x-csharp': 'cs',
      'text/x-go': 'go',
      'text/x-ruby': 'rb',
      'text/x-rust': 'rs',
      'application/pdf': 'pdf',
      'application/zip': 'zip',
      'application/x-tar': 'tar',
      'application/x-gzip': 'gz',
      'application/gzip': 'gz',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    }

    // Check for exact match first
    if (extensionMap[contentType]) {
      return extensionMap[contentType]
    }

    // Check for partial matches
    for (const [type, ext] of Object.entries(extensionMap)) {
      if (contentType.includes(type)) {
        return ext
      }
    }

    // Default fallback patterns
    if (contentType.includes('text/')) {
      if (contentType.includes('plain')) return 'txt'
      return 'txt'
    }
    if (contentType.includes('application/')) {
      return 'txt'
    }
    if (contentType.includes('image/')) {
      return 'img'
    }

    return 'txt'
  }

  $: filteredPastes = pastes.filter(paste => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (paste.name && paste.name.toLowerCase().includes(term)) ||
      paste.id.toLowerCase().includes(term) ||
      (paste.content_type && getTypeLabel(paste.content_type).toLowerCase().includes(term))
    )
  })

  function sharePaste(pasteId) {
    const shareUrl = `${window.location.origin}/${pasteId}`
    copyToClipboard(shareUrl, 'Link copied to clipboard!')
  }

  async function copyPasteContent(pasteId) {
    try {
      const response = await getPasteRaw(pasteId)
      const content = await response.data.text()
      copyToClipboard(content, 'Content copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy paste content:', error)
      showToast('Failed to copy paste content', 'error')
    }
  }

  async function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    try {
      await navigator.clipboard.writeText(text)
      showToast(successMessage, 'success')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showToast('Failed to copy to clipboard', 'error')
    }
  }

  async function downloadPaste(pasteId, pasteName, contentType) {
    try {
      const response = await getPasteRaw(pasteId)
      const blob = new Blob([response.data], { type: contentType || 'text/plain' })
      const url = window.URL.createObjectURL(blob)

      // Generate appropriate file extension based on content type
      const extension = getFileExtension(contentType)

      // Generate filename from paste name with correct extension, or use default
      const cleanName = pasteName ? pasteName.replace(/[^a-zA-Z0-9-_]/g, '_') : pasteId
      const filename = `${cleanName}.${extension}`

      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up object URL
      window.URL.revokeObjectURL(url)

      showToast(`Downloading ${filename}...`, 'success')
    } catch (error) {
      console.error('Failed to download paste:', error)
      showToast('Failed to download paste', 'error')
    }
  }

  function viewRaw(pasteId) {
    window.open(`/${pasteId}/raw`, '_blank')
  }
</script>

<div class="mb-8">
  <div class="bg-white shadow-sm rounded-lg border border-gray-200">
    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900 flex items-center">
        <i class="fas fa-clock text-blue-600 mr-2"></i>
        Recent Pastes
      </h2>
      <div class="relative flex-1 max-w-md ml-4">
        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Filter by name, type, or id..."
          class="w-full pl-9 pr-3 py-1.5 text-sm maas-input"
        />
      </div>
    </div>

  {#if loading}
      <div class="p-8 text-center">
        <div class="inline-block">
          <i class="fas fa-spinner fa-spin text-[#772953] text-2xl"></i>
        </div>
        <p class="text-sm text-gray-500 mt-2">Loading pastes...</p>
      </div>
    {:else if filteredPastes.length === 0}
      <div class="p-8 text-center text-gray-500">
        <i class="fas fa-inbox text-4xl mb-2"></i>
        <p>
          {searchTerm ? `No pastes found matching "${searchTerm}"` : 'No pastes yet'}
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full maas-table text-sm">
          <thead>
            <tr class="text-gray-500 uppercase text-xs tracking-wider bg-gray-50">
              <th class="w-8"><input type="checkbox" class="rounded border-gray-300"></th>
              <th>Title / ID</th>
              <th>Type</th>
              <th>Visibility</th>
              <th>Created</th>
              <th>Size</th>
              <th class="w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredPastes as paste (paste.id)}
              <tr class="hover:bg-gray-50 cursor-pointer">
                <td class="text-center">
                  <input type="checkbox" class="rounded border-gray-300" />
                </td>
                <td>
                  <a href="/{paste.id}" class="font-medium text-[#0066cc] hover:underline block">
                    {paste.name || 'Untitled'}
                  </a>
                  <span class="text-xs text-gray-400 font-mono">{paste.id}</span>
                </td>
                <td>
                  <span class="text-sm">{getTypeLabel(paste.content_type)}</span>
                </td>
                <td>
                  {@html getStatusPill(paste.access_level)}
                </td>
                <td class="text-gray-500 text-xs">
                  {formatTimeAgo(paste.created_at)}
                </td>
                <td class="font-mono text-xs">
                  {formatBytes(paste.size_bytes || 0)}
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <button
                      on:click|stopPropagation={() => sharePaste(paste.id)}
                      class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Share paste"
                    >
                      <i class="fas fa-share text-xs"></i>
                    </button>
                    <button
                      on:click|stopPropagation={() => copyPasteContent(paste.id)}
                      class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Copy content to clipboard"
                    >
                      <i class="fas fa-copy text-xs"></i>
                    </button>
                    <button
                      on:click|stopPropagation={() => viewRaw(paste.id)}
                      class="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="View raw content"
                    >
                      <i class="fas fa-code text-xs"></i>
                    </button>
                    <button
                      on:click|stopPropagation={() => downloadPaste(paste.id, paste.name, paste.content_type)}
                      class="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                      title="Download paste"
                    >
                      <i class="fas fa-download text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <span>{filteredPastes.length} paste{filteredPastes.length !== 1 ? 's' : ''}</span>
      </div>
    {/if}
  </div>
</div>
