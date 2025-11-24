/**
 * Frontend content processors for different file types
 * Processes raw content into formatted previews
 */

import hljs from 'highlight.js'
import { processMarkdown } from './markdownProcessor.js'

/**
 * Determine if a content type should be treated as code
 */
function shouldTreatAsCode(contentType) {
  // Explicit code content types
  if (contentType.startsWith('application/') && [
    'javascript', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'config',
    'ld+json', 'hal+json', 'vnd.api+json', 'atom+xml', 'rss+xml'
  ].some(ctype => contentType.includes(ctype))) {
    return true
  }

  // Check for common code file patterns in content type
  const codeIndicators = [
    'code', 'script', 'source', 'json', 'xml', 'yaml', 'yml', 'toml',
    'ini', 'config', 'css', 'scss', 'sass', 'less', 'stylus',
    'python', 'javascript', 'java', 'c++', 'ruby', 'go', 'rust',
    'php', 'perl', 'shell', 'bash', 'powershell', 'sql',
    'dockerfile', 'makefile', 'typescript', 'coffeescript'
  ]

  if (codeIndicators.some(indicator => contentType.includes(indicator))) {
    return true
  }

  // All text/* types except these specific ones
  if (contentType.startsWith('text/')) {
    const excludeTypes = ['text/markdown', 'text/html', 'text/csv']
    return !excludeTypes.includes(contentType)
  }

  return false
}

/**
 * Detect programming language from content
 */
export function detectLanguage(content, contentType, languageHint) {
  if (languageHint && languageHint !== 'auto') {
    return languageHint
  }

  // Extract language from content type
  if (contentType) {
    const contentTypeLower = contentType.toLowerCase()

    // Map content types to language names
    const contentTypeMap = {
      'application/json': 'json',
      'text/json': 'json',
      'text/css': 'css',
      'text/scss': 'scss',
      'text/sass': 'sass',
      'text/less': 'less',
      'text/xml': 'xml',
      'application/xml': 'xml',
      'text/x-yaml': 'yaml',
      'application/yaml': 'yaml',
      'application/x-yaml': 'yaml',
      'text/x-python': 'python',
      'application/x-python': 'python',
      'text/x-php': 'php',
      'application/x-php': 'php',
      'text/x-ruby': 'ruby',
      'application/x-ruby': 'ruby',
      'text/x-go': 'go',
      'text/x-rust': 'rust',
      'text/x-typescript': 'typescript',
      'application/x-typescript': 'typescript',
      'text/x-java-source': 'java',
      'text/x-c': 'c',
      'text/x-c++': 'cpp',
      'text/x-csrc': 'c',
      'text/x-c++src': 'cpp',
      'text/x-shellscript': 'bash',
      'application/x-sh': 'bash',
      'text/x-sql': 'sql',
      'application/sql': 'sql',
      'text/x-dockerfile': 'dockerfile',
      'text/x-makefile': 'makefile'
    }

    // Exact match first
    if (contentTypeMap[contentTypeLower]) {
      return contentTypeMap[contentTypeLower]
    }

    // Pattern matching for content types
    if (contentTypeLower.includes('json')) return 'json'
    if (contentTypeLower.includes('css')) return 'css'
    if (contentTypeLower.includes('scss')) return 'scss'
    if (contentTypeLower.includes('sass')) return 'sass'
    if (contentTypeLower.includes('less')) return 'less'
    if (contentTypeLower.includes('xml')) return 'xml'
    if (contentTypeLower.includes('yaml') || contentTypeLower.includes('yml')) return 'yaml'
    if (contentTypeLower.includes('python')) return 'python'
    if (contentTypeLower.includes('javascript') || contentTypeLower.includes('js')) return 'javascript'
    if (contentTypeLower.includes('typescript') || contentTypeLower.includes('ts')) return 'typescript'
    if (contentTypeLower.includes('java')) return 'java'
    if (contentTypeLower.includes('php')) return 'php'
    if (contentTypeLower.includes('ruby')) return 'ruby'
    if (contentTypeLower.includes('go')) return 'go'
    if (contentTypeLower.includes('rust')) return 'rust'
    if (contentTypeLower.includes('c++') || contentTypeLower.includes('cpp')) return 'cpp'
    if (contentTypeLower.includes('c ')) return 'c'
    if (contentTypeLower.includes('bash') || contentTypeLower.includes('shell')) return 'bash'
    if (contentTypeLower.includes('sql')) return 'sql'
    if (contentTypeLower.includes('dockerfile')) return 'dockerfile'
    if (contentTypeLower.includes('makefile')) return 'makefile'
  }

  // Try to auto-detect based on content
  try {
    const result = hljs.highlightAuto(content.slice(0, 1000))
    return result.language || 'plaintext'
  } catch (e) {
    return 'plaintext'
  }
}

/**
 * Highlight code with syntax highlighting
 */
export function highlightCode(content, language) {
  try {
    const highlighted = hljs.highlight(content, { language, ignoreIllegals: true })
    return highlighted.value
  } catch (e) {
    // Fallback to plain text if highlighting fails
    return hljs.highlight(content, { language: 'plaintext' }).value
  }
}

/**
 * Process text content
 */
export function processText(content) {
  const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
  const truncated = text.length > 500
  const preview = truncated ? text.slice(0, 500) : text

  return {
    type: 'text',
    preview,
    truncated,
    metadata: {
      lineCount: text.split('\n').length,
      charCount: text.length,
      wordCount: text.split(/\s+/).length
    }
  }
}

/**
 * Process code content with syntax highlighting
 */
export function processCode(content, contentType, languageHint) {
  const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
  const language = detectLanguage(text, contentType, languageHint)

  return {
    type: 'code',
    preview: text,
    highlighted: highlightCode(text, language),
    metadata: {
      language,
      lineCount: text.split('\n').length,
      charCount: text.length
    }
  }
}

/**
 * Process image content
 */
export function processImage(content) {
  const blob = new Blob([content], { type: 'image/*' })
  const url = URL.createObjectURL(blob)

  return {
    type: 'image',
    url,
    metadata: {
      // Additional metadata would need canvas inspection
    }
  }
}

/**
 * Process markdown content
 */
export { processMarkdown }

/**
 * Process HTML content
 */
export function processHTML(content) {
  const text = typeof content === 'string' ? content : new TextDecoder().decode(content)

  return {
    type: 'html',
    html: text,
    metadata: {
      charCount: text.length,
      // Basic HTML structure validation
      hasDoctype: text.toLowerCase().includes('<!doctype'),
      hasHtmlTag: text.toLowerCase().includes('<html'),
      hasBodyTag: text.toLowerCase().includes('<body')
    }
  }
}

/**
 * Process CSV content
 */
export function processCSV(content) {
  const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
  const lines = text.split('\n')
  const headers = lines[0]?.split(',').map(h => h.trim()) || []
  const rows = lines.slice(1, 11).map(line => {
    const cells = line.split(',')
    const row = {}
    headers.forEach((header, idx) => {
      row[header] = cells[idx]?.trim() || ''
    })
    return row
  })

  return {
    type: 'csv',
    rows,
    metadata: {
      columnCount: headers.length,
      rowCount: lines.length - 1,
      columns: headers
    }
  }
}

/**
 * Main processor function that delegates to type-specific processors
 */
export async function processContent(content, contentType, languageHint) {
  const contentTypeLower = contentType.toLowerCase()

  // HTML
  if (
    contentTypeLower.includes('text/html') ||
    contentTypeLower.includes('application/xhtml+xml') ||
    contentTypeLower.includes('html')
  ) {
    return processHTML(content)
  }

  // Markdown
  if (
    contentTypeLower.includes('markdown') ||
    contentTypeLower.includes('text/markdown') ||
    languageHint === 'markdown' ||
    languageHint === 'md'
  ) {
    return processMarkdown(content)
  }

  // Code files
  if (shouldTreatAsCode(contentTypeLower)) {
    return processCode(content, contentType, languageHint)
  }

  // CSV
  if (contentTypeLower.includes('csv')) {
    return processCSV(content)
  }

  // Images
  if (contentTypeLower.includes('image')) {
    return processImage(content)
  }

  // Text (fallback)
  if (contentTypeLower.includes('text')) {
    return processText(content)
  }

  // Unknown - return as text
  return processText(content)
}
