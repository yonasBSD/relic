// Centralized file type definitions
const FILE_TYPES = [
  {
    syntax: 'javascript',
    label: 'JavaScript',
    icon: 'fa-brands fa-js',
    mime: 'application/javascript',
    extensions: ['js', 'jsx', 'mjs', 'cjs']
  },
  {
    syntax: 'typescript',
    label: 'TypeScript',
    icon: 'fa-brands fa-js', // FontAwesome doesn't have TS specific icon yet, usually JS icon or custom
    mime: 'application/x-typescript',
    extensions: ['ts', 'tsx']
  },
  {
    syntax: 'python',
    label: 'Python',
    icon: 'fa-brands fa-python',
    mime: 'text/x-python',
    extensions: ['py', 'pyx', 'pyi']
  },
  {
    syntax: 'html',
    label: 'HTML',
    icon: 'fa-brands fa-html5',
    mime: 'text/html',
    extensions: ['html', 'htm']
  },
  {
    syntax: 'css',
    label: 'CSS',
    icon: 'fa-brands fa-css3-alt',
    mime: 'text/css',
    extensions: ['css', 'scss', 'sass', 'less']
  },
  {
    syntax: 'json',
    label: 'JSON',
    icon: 'fa-code',
    mime: 'application/json',
    extensions: ['json', 'jsonc']
  },
  {
    syntax: 'markdown',
    label: 'Markdown',
    icon: 'fa-file-lines',
    mime: 'text/markdown',
    extensions: ['md', 'markdown']
  },
  {
    syntax: 'xml',
    label: 'XML',
    icon: 'fa-code',
    mime: 'application/xml',
    extensions: ['xml', 'xsl', 'xslt']
  },
  {
    syntax: 'yaml',
    label: 'YAML',
    icon: 'fa-code',
    mime: 'application/x-yaml',
    extensions: ['yaml', 'yml']
  },
  {
    syntax: 'bash',
    label: 'Bash',
    icon: 'fa-terminal',
    mime: 'text/x-shellscript',
    extensions: ['sh', 'bash', 'zsh', 'fish']
  },
  {
    syntax: 'sql',
    label: 'SQL',
    icon: 'fa-database',
    mime: 'application/sql',
    extensions: ['sql']
  },
  {
    syntax: 'java',
    label: 'Java',
    icon: 'fa-brands fa-java',
    mime: 'text/x-java-source',
    extensions: ['java', 'class']
  },
  {
    syntax: 'php',
    label: 'PHP',
    icon: 'fa-brands fa-php',
    mime: 'application/x-php',
    extensions: ['php']
  },
  {
    syntax: 'ruby',
    label: 'Ruby',
    icon: 'fa-gem',
    mime: 'application/x-ruby',
    extensions: ['rb']
  },
  {
    syntax: 'go',
    label: 'Go',
    icon: 'fa-brands fa-golang',
    mime: 'text/x-go',
    extensions: ['go']
  },
  {
    syntax: 'rust',
    label: 'Rust',
    icon: 'fa-brands fa-rust',
    mime: 'text/x-rust',
    extensions: ['rs']
  },
  {
    syntax: 'c',
    label: 'C',
    icon: 'fa-code',
    mime: 'text/x-c',
    extensions: ['c', 'h']
  },
  {
    syntax: 'cpp',
    label: 'C++',
    icon: 'fa-code',
    mime: 'text/x-c++',
    extensions: ['cpp', 'cc', 'cxx', 'hpp']
  },
  {
    syntax: 'dockerfile',
    label: 'Dockerfile',
    icon: 'fa-brands fa-docker',
    mime: 'text/x-dockerfile',
    extensions: ['dockerfile']
  },
  {
    syntax: 'makefile',
    label: 'Makefile',
    icon: 'fa-file-code',
    mime: 'text/x-makefile',
    extensions: ['makefile']
  },
  {
    syntax: 'text',
    label: 'Text',
    icon: 'fa-file-lines',
    mime: 'text/plain',
    extensions: ['txt', 'text', 'conf', 'log', 'ini']
  },
  {
    syntax: 'pdf',
    label: 'PDF',
    icon: 'fa-file-pdf',
    mime: 'application/pdf',
    extensions: ['pdf']
  }
]

// Fallback for unknown types
const UNKNOWN_TYPE = {
  syntax: 'auto',
  label: 'Unknown',
  icon: 'fa-file',
  mime: 'application/octet-stream',
  extensions: []
}

export function getTypeLabel(contentType) {
  if (!contentType) return 'Text'

  const lowerType = contentType.toLowerCase()

  // First, try exact MIME type match
  const exactMatch = FILE_TYPES.find(t => lowerType === t.mime.toLowerCase())
  if (exactMatch) return exactMatch.label

  // Then try partial MIME type match (for variations like text/html; charset=utf-8)
  const mimeMatch = FILE_TYPES.find(t => lowerType.startsWith(t.mime.toLowerCase()))
  if (mimeMatch) return mimeMatch.label

  // Special cases for generic matches
  if (lowerType.includes('pdf')) return 'PDF'
  if (lowerType.includes('image')) return 'Image'
  if (lowerType.includes('csv')) return 'CSV'
  if (lowerType.includes('zip') || lowerType.includes('archive') || lowerType.includes('tar') || lowerType.includes('gzip')) return 'Archive'
  if (lowerType.includes('text')) return 'Text'

  // Finally, try syntax substring match (less reliable, but catches some edge cases)
  const syntaxMatch = FILE_TYPES.find(t => lowerType.includes(t.syntax) && t.syntax.length > 2)
  if (syntaxMatch) return syntaxMatch.label

  return 'Unknown'
}

export function getTypeIcon(contentType) {
  if (!contentType) return 'fa-file'

  const lowerType = contentType.toLowerCase()

  // First, try exact MIME type match
  const exactMatch = FILE_TYPES.find(t => lowerType === t.mime.toLowerCase())
  if (exactMatch) return exactMatch.icon

  // Then try partial MIME type match
  const mimeMatch = FILE_TYPES.find(t => lowerType.startsWith(t.mime.toLowerCase()))
  if (mimeMatch) return mimeMatch.icon

  // Special cases
  if (lowerType.includes('pdf')) return 'fa-file-pdf'
  if (lowerType.includes('image')) return 'fa-image'
  if (lowerType.includes('csv')) return 'fa-file-csv'
  if (lowerType.includes('zip') || lowerType.includes('archive') || lowerType.includes('tar') || lowerType.includes('gzip')) return 'fa-file-zipper'
  if (lowerType.includes('text')) return 'fa-file-lines'

  // Finally, try syntax substring match (only for longer syntax strings)
  const syntaxMatch = FILE_TYPES.find(t => lowerType.includes(t.syntax) && t.syntax.length > 2)
  if (syntaxMatch) return syntaxMatch.icon

  return 'fa-file'
}

export function getTypeIconColor(contentType) {
  return 'text-gray-500'
}

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Map type selections to MIME types
export function getContentType(syntax) {
  const type = FILE_TYPES.find(t => t.syntax === syntax)
  return type ? type.mime : 'text/plain'
}

// Map language selection to file extensions
export function getFileExtension(syntax) {
  const type = FILE_TYPES.find(t => t.syntax === syntax)
  return type ? type.extensions[0] : 'txt'
}

// Auto-detect language hint from content type
export function detectLanguageHint(contentType) {
  if (!contentType) return 'auto'
  const lowerType = contentType.toLowerCase()
  const type = FILE_TYPES.find(t => lowerType.includes(t.syntax) || lowerType === t.mime)
  return type ? type.syntax : 'auto'
}

// Get syntax from file extension
export function getSyntaxFromExtension(extension) {
  if (!extension) return null
  const ext = extension.toLowerCase()
  const type = FILE_TYPES.find(t => t.extensions.includes(ext))
  return type ? type.syntax : null
}

// Check if content type is a code type
export function isCodeType(contentType) {
  if (!contentType) return false
  const lowerType = contentType.toLowerCase()

  // Check against our known types (excluding text, though text might be code-ish, usually we want highlighting for specific syntaxes)
  const type = FILE_TYPES.find(t => lowerType.includes(t.syntax) || lowerType === t.mime)
  if (type && type.syntax !== 'text') return true

  // Fallback checks for other common code indicators
  if (lowerType.includes('json') ||
    lowerType.includes('xml') ||
    lowerType.includes('script') ||
    lowerType.includes('source')) {
    return true
  }

  return false
}

// Get all available syntax options for forms
export function getAvailableSyntaxOptions() {
  // Return only the most common ones used in forms, in a user-friendly order
  return [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'text', label: 'Plain Text' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'pdf', label: 'PDF' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'bash', label: 'Bash' },
    { value: 'sql', label: 'SQL' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
    { value: 'dockerfile', label: 'Dockerfile' },
    { value: 'makefile', label: 'Makefile' }
  ]
}

// Format time ago string
export function formatTimeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Copy relic ID to clipboard
export function copyRelicId(relicId) {
  navigator.clipboard.writeText(relicId).then(() => {
    // Could add toast notification here if desired
  })
}

// Get default items per page based on screen size
export function getDefaultItemsPerPage() {
  if (typeof window === 'undefined') return 20
  const width = window.innerWidth
  if (width < 768) return 10      // Mobile
  return 20                        // Tablet & Desktop
}
