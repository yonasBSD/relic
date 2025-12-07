<script>
  import { createEventDispatcher } from 'svelte';
  import { processMarkdown } from '../services/markdownProcessor';
  
  export let initialValue = '';
  export let submitLabel = 'Comment';
  
  const dispatch = createEventDispatcher();
  
  let value = initialValue;
  let activeTab = 'write'; // 'write' | 'preview'
  let previewHtml = '';
  let textarea;
  
  async function togglePreview() {
    if (activeTab === 'write') {
      const result = await processMarkdown(value);
      previewHtml = result.html;
      activeTab = 'preview';
    } else {
      activeTab = 'write';
      // Focus textarea on next tick
      setTimeout(() => textarea?.focus(), 0);
    }
  }
  
  function insertText(before, after = '') {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selection + after + text.substring(end);
    value = newText;
    
    // Restore selection / cursor position
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }
  
  function handleKeydown(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        handleSubmit();
    }
  }
  
  function handleSubmit() {
    if (!value.trim()) return;
    dispatch('submit', value);
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="comment-editor">
  <div class="editor-header">
    <div class="tabs">
      <button class:active={activeTab === 'write'} on:click={() => activeTab = 'write'}>Write</button>
      <button class:active={activeTab === 'preview'} on:click={togglePreview}>Preview</button>
    </div>
    {#if activeTab === 'write'}
    <div class="toolbar">
      <button title="Bold" on:click={() => insertText('**', '**')}><i class="fas fa-bold"></i></button>
      <button title="Italic" on:click={() => insertText('*', '*')}><i class="fas fa-italic"></i></button>
      <button title="Link" on:click={() => insertText('[', '](url)')}><i class="fas fa-link"></i></button>
      <button title="Code" on:click={() => insertText('`', '`')}><i class="fas fa-code"></i></button>
      <button title="Quote" on:click={() => insertText('> ')}><i class="fas fa-quote-right"></i></button>
      <button title="List" on:click={() => insertText('- ')}><i class="fas fa-list-ul"></i></button>
    </div>
    {/if}
  </div>

  <div class="editor-content">
    {#if activeTab === 'write'}
      <textarea
        bind:this={textarea}
        bind:value
        placeholder="Leave a comment... (Markdown supported)"
        on:keydown={handleKeydown}
      ></textarea>
    {:else}
      <div class="preview markdown-body">
        {@html previewHtml}
      </div>
    {/if}
  </div>

  <div class="editor-actions">
    <span class="hint">Ctrl+Enter to submit</span>
    <div class="buttons">
      <button class="cancel-btn" on:click={handleCancel}>Cancel</button>
      <button class="submit-btn" on:click={handleSubmit} disabled={!value.trim()}>{submitLabel}</button>
    </div>
  </div>
</div>

<style>
  .comment-editor {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    width: 100%;
    transition: all 0.2s ease;
    resize: vertical;
    overflow: hidden;
    min-height: 200px;
  }

  .comment-editor:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 0 12px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  
  .tabs {
    display: flex;
    gap: 2px;
  }
  
  .tabs button {
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #6b7280;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: -1px;
  }
  
  .tabs button:hover {
    color: #374151;
  }

  .tabs button.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }
  
  .toolbar {
    display: flex;
    gap: 4px;
    padding: 4px 0;
  }
  
  .toolbar button {
    padding: 6px;
    color: #6b7280;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }
  
  .toolbar button:hover {
    background: #e5e7eb;
    color: #111827;
  }
  
  .editor-content {
    position: relative;
    min-height: 120px;
    background: white;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  textarea {
    width: 100%;
    min-height: 120px;
    padding: 16px;
    border: none;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.6;
    outline: none;
    display: block;
    color: #1f2937;
    flex: 1;
  }
  
  .preview {
    padding: 16px;
    min-height: 120px;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.6;
    color: #374151;
    resize: none;
    flex: 1;
  }
  
  .editor-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  
  .hint {
    font-size: 12px;
    color: #9ca3af;
  }
  
  .buttons {
    display: flex;
    gap: 10px;
  }
  
  .cancel-btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #4b5563;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  
  .submit-btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: white;
    background: #2563eb;
    border: 1px solid #2563eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .submit-btn:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
  
  .submit-btn:disabled {
    background: #93c5fd;
    border-color: #93c5fd;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  /* Markdown Styles for Preview */
  :global(.markdown-body p) { margin-bottom: 0.75em; }
  :global(.markdown-body pre) { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 0.75em; }
  :global(.markdown-body code) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em; color: #ef4444; }
  :global(.markdown-body blockquote) { border-left: 4px solid #e5e7eb; padding-left: 12px; color: #6b7280; margin-left: 0; margin-bottom: 0.75em; font-style: italic; }
  :global(.markdown-body ul, .markdown-body ol) { padding-left: 24px; margin-bottom: 0.75em; }
  :global(.markdown-body a) { color: #2563eb; text-decoration: none; }
  :global(.markdown-body a:hover) { text-decoration: underline; }
  :global(.markdown-body img) { max-width: 100%; border-radius: 4px; }
</style>