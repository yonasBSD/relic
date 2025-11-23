<script>
  import { onMount } from 'svelte'
  import * as monaco from 'monaco-editor'

  export let value = ''
  export let language = 'plaintext'
  export let readOnly = true
  export let height = '600px'

  let container
  let editor

  onMount(async () => {
    if (!container) return

    // Use Monaco's built-in tokenization which doesn't require workers
    self.MonacoEnvironment = {
      getWorker: () => {
        return {
          postMessage: () => {},
          terminate: () => {}
        }
      }
    }

    try {
      editor = monaco.editor.create(container, {
        value: value || '',
        language: language || 'plaintext',
        readOnly,
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        fontSize: 13,
        fontFamily: '"Courier New", monospace',
        padding: { top: 16, bottom: 16 },
        // Enable semantic highlighting with built-in tokenization
        'editor.semanticHighlighting.enabled': 'configuredByTheme',
        // Keep syntax highlighting without language services
        'editor.defaultColorDecorators': false,
        'editor.colorDecorators': false,
        'editor.formatOnPaste': false,
        'editor.formatOnType': false
      })
    } catch (e) {
      console.error('Failed to create Monaco Editor:', e)
    }

    return () => {
      editor?.dispose()
    }
  })

  $: if (editor && value) {
    const currentValue = editor.getValue()
    if (currentValue !== value) {
      editor.setValue(value)
    }
  }

  $: if (editor && language) {
    try {
      monaco.editor.setModelLanguage(editor.getModel(), language)
    } catch (e) {
      console.error('Failed to set language:', e)
    }
  }
</script>

<div class="bg-white shadow-sm rounded-lg border border-gray-200 mb-6 overflow-hidden">
  <div bind:this={container} style="height: {height};" class="w-full" />
</div>
