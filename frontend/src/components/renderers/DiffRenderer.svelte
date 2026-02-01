<script>
  import { createEventDispatcher } from 'svelte';
  import CodeRenderer from './CodeRenderer.svelte';

  export let processed;
  export let relicId;
  export let showSource = false;
  export let showSyntaxHighlighting;
  export let showLineNumbers;
  export let showComments = true;
  export let fontSize = 13;
  export let comments = [];
  export let isAdmin = false;
  export let darkMode = true;

  const dispatch = createEventDispatcher();

  $: files = processed.files || [];

  function getLineClass(type) {
    if (type === 'add') return 'line-add';
    if (type === 'delete') return 'line-delete';
    return 'line-context';
  }

  function getSign(type) {
    if (type === 'add') return '+';
    if (type === 'delete') return '-';
    return ' ';
  }
</script>

{#if showSource}
  <CodeRenderer
    {processed}
    {relicId}
    {showSyntaxHighlighting}
    {showLineNumbers}
    {showComments}
    {fontSize}
    {comments}
    {isAdmin}
    {darkMode}
    on:line-clicked
    on:line-range-selected
    on:multi-line-selected
    on:line-copied
    on:createComment
    on:updateComment
    on:deleteComment
    on:toggle-comments
  />
{:else}
  <div class="diff-container" class:dark-mode={darkMode}>
    {#if files.length === 0}
      <div class="p-8 text-center text-gray-500">
        <i class="fas fa-info-circle mb-2 text-2xl"></i>
        <p>No changes found in this diff.</p>
      </div>
    {:else}
      <div class="diff-summary px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
         <span class="text-sm font-medium text-gray-700">
            Showing {files.length} changed file{files.length !== 1 ? 's' : ''}
         </span>
         <div class="flex gap-2">
            <!-- Summary stats could go here -->
         </div>
      </div>

      {#each files as file}
        <div class="file-diff mb-6 border border-gray-200 rounded-lg overflow-hidden mx-4 my-4 shadow-sm">
          <div class="file-header px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center sticky top-0 z-10">
            <i class="fas fa-file-code mr-2 text-gray-500"></i>
            <span class="text-sm font-semibold truncate text-gray-800">{file.name}</span>
            <div class="ml-auto flex items-center gap-3">
               <!-- File-specific info -->
            </div>
          </div>
          
          <div class="file-content overflow-x-auto">
            <table class="w-full text-xs font-mono border-collapse">
              <tbody>
                {#each file.hunks as hunk}
                  <tr class="hunk-header">
                    <td class="line-num select-none">...</td>
                    <td class="line-num select-none">...</td>
                    <td class="line-content text-gray-500 bg-blue-50/50 py-1 px-4 italic">
                      {hunk.header}
                    </td>
                  </tr>
                  
                  {#each hunk.lines as line, idx}
                    <tr class={getLineClass(line.type)}>
                      <td class="line-num select-none">
                        {line.oldLine || ''}
                      </td>
                      <td class="line-num select-none">
                        {line.newLine || ''}
                      </td>
                      <td class="line-content whitespace-pre py-0.5 px-4 relative">
                        <span class="sign inline-block w-4 mr-2 select-none opacity-50">{getSign(line.type)}</span>
                        <span class="content">{line.content.substring(1)}</span>
                      </td>
                    </tr>
                  {/each}
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .diff-container {
    background-color: white;
  }

  .diff-container.dark-mode {
    background-color: #0d1117;
    color: #c9d1d9;
  }

  .dark-mode .file-diff {
    border-color: #30363d;
    background-color: #0d1117;
  }

  .dark-mode .file-header {
    background-color: #161b22;
    border-color: #30363d;
    color: #f0f6fc;
  }

  .dark-mode .diff-summary {
    background-color: #161b22;
    border-color: #30363d;
    color: #f0f6fc;
  }
  
  .dark-mode .diff-summary span {
      color: #f0f6fc;
  }

  .line-num {
    width: 40px;
    text-align: right;
    padding: 0 8px;
    color: rgba(0,0,0,0.3);
    border-right: 1px solid rgba(0,0,0,0.05);
    background-color: rgba(0,0,0,0.02);
  }

  .dark-mode .line-num {
    color: #484f58;
    background-color: #0d1117;
    border-right-color: #30363d;
  }

  .line-content {
    line-height: 20px;
    word-break: break-all;
  }

  /* Success/Addition Colors */
  .line-add .line-content {
    background-color: #dafbe1;
  }
  .line-add .line-num {
    background-color: #ccffd8;
  }
  .dark-mode .line-add .line-content {
    background-color: rgba(46, 160, 67, 0.15);
  }
  .dark-mode .line-add .line-num {
    background-color: rgba(46, 160, 67, 0.3);
    color: #3fb950;
  }

  /* Danger/Deletion Colors */
  .line-delete .line-content {
    background-color: #ffebe9;
  }
  .line-delete .line-num {
    background-color: #ffdce0;
  }
  .dark-mode .line-delete .line-content {
    background-color: rgba(248, 81, 70, 0.15);
  }
  .dark-mode .line-delete .line-num {
    background-color: rgba(248, 81, 70, 0.3);
    color: #f85149;
  }

  /* Hunk Header Decor */
  .hunk-header .line-content {
    background-color: #f1f8ff;
    color: #0550ae;
    font-size: 0.75rem;
  }
  .dark-mode .hunk-header .line-content {
    background-color: rgba(56, 139, 253, 0.15);
    color: #79c0ff;
  }

  .sign {
    user-select: none;
  }
</style>
