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
  export let diffViewMode = 'unified'; // 'unified' or 'split'

  const dispatch = createEventDispatcher();

  $: files = processed.files || [];

  function getLineClass(type) {
    if (type === 'add') return 'line-add';
    if (type === 'delete') return 'line-delete';
    if (type === 'meta') return 'line-meta';
    return 'line-context';
  }

  function getSign(type) {
    if (type === 'add') return '+';
    if (type === 'delete') return '-';
    return ' ';
  }

  // Aligns lines for split view by grouping consecutive deletions and additions
  function getAlignedHunkLines(hunkLines) {
    const alignedRows = [];
    let i = 0;
    
    while (i < hunkLines.length) {
      const line = hunkLines[i];
      
      if (line.type === 'context' || line.type === 'meta') {
        alignedRows.push({
          left: line,
          right: line,
          type: line.type
        });
        i++;
      } else if (line.type === 'delete') {
        // Look ahead for additions to align with
        const deletions = [];
        const additions = [];
        
        // Collect consecutive deletions
        while (i < hunkLines.length && hunkLines[i].type === 'delete') {
          deletions.push(hunkLines[i]);
          i++;
        }
        
        // Collect subsequent consecutive additions
        while (i < hunkLines.length && hunkLines[i].type === 'add') {
          additions.push(hunkLines[i]);
          i++;
        }
        
        // Pair them up
        const maxLen = Math.max(deletions.length, additions.length);
        for (let j = 0; j < maxLen; j++) {
          alignedRows.push({
            left: deletions[j] || null,
            right: additions[j] || null,
            type: 'change'
          });
        }
      } else if (line.type === 'add') {
        // Lone addition (not preceded by deletions)
        alignedRows.push({
          left: null,
          right: line,
          type: 'add'
        });
        i++;
      }
    }
    
    return alignedRows;
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
  <div class="diff-container" class:dark-mode={darkMode} style="--font-size: {fontSize}px">
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
      </div>

      {#each files as file}
        <div class="file-diff mb-6 border border-gray-200 rounded-lg overflow-hidden mx-4 my-4 shadow-sm">
          <div class="file-header px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center sticky top-0 z-10">
            <i class="fas fa-file-code mr-2 text-gray-500"></i>
            <span class="text-sm font-semibold truncate text-gray-800">{file.name}</span>
          </div>
          
          <div class="file-content">
            {#if diffViewMode === 'split'}
              <table class="w-full text-xs font-mono border-collapse table-fixed">
                <colgroup>
                  <col style="width: 50px;" />
                  <col />
                  <col style="width: 50px;" />
                  <col />
                </colgroup>
                <tbody>
                  {#each file.hunks as hunk}
                    <tr class="hunk-header">
                      <td colspan="4" class="line-content text-gray-500 bg-blue-50/50 py-1 px-4 italic border-b border-blue-100">
                        {hunk.header}
                      </td>
                    </tr>
                    
                    {#each getAlignedHunkLines(hunk.lines) as row}
                      <tr class="split-row">
                        <!-- Left side -->
                        <td class="line-num select-none text-right px-2 border-r border-gray-200 {row.left?.type === 'delete' ? 'del-bg' : ''}">
                          {row.left?.oldLine || ''}
                        </td>
                        <td class="line-content whitespace-pre py-0.5 px-2 border-r border-gray-200 {row.left?.type === 'delete' ? 'del-content' : (!row.left ? 'empty-line' : '')}">
                          {#if row.left}
                            <span class="sign">{getSign(row.left.type)}</span>{row.left.content.substring(1)}
                          {/if}
                        </td>
                        <!-- Right side -->
                        <td class="line-num select-none text-right px-2 border-r border-gray-200 {row.right?.type === 'add' ? 'add-bg' : ''}">
                          {row.right?.newLine || ''}
                        </td>
                        <td class="line-content whitespace-pre py-0.5 px-2 {row.right?.type === 'add' ? 'add-content' : (!row.right ? 'empty-line' : '')}">
                          {#if row.right}
                            <span class="sign">{getSign(row.right.type)}</span>{row.right.content.substring(1)}
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  {/each}
                </tbody>
              </table>
            {:else}
              <table class="w-full text-xs font-mono border-collapse">
                <colgroup>
                  <col style="width: 50px;" />
                  <col style="width: 50px;" />
                  <col />
                </colgroup>
                <tbody>
                  {#each file.hunks as hunk}
                    <tr class="hunk-header">
                      <td colspan="3" class="line-content text-gray-500 bg-blue-50/50 py-1 px-4 italic border-b border-blue-100">
                        {hunk.header}
                      </td>
                    </tr>
                    
                    {#each hunk.lines as line}
                      <tr class={getLineClass(line.type)}>
                        <td class="line-num select-none">
                          {line.oldLine || ''}
                        </td>
                        <td class="line-num select-none">
                          {line.newLine || ''}
                        </td>
                        <td class="line-content whitespace-pre py-0.5 px-4 relative">
                          <span class="sign">{getSign(line.type)}</span>
                          <span class="content">{line.content.substring(1)}</span>
                        </td>
                      </tr>
                    {/each}
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .diff-container {
    background-color: white;
    font-size: var(--font-size);
  }

  .diff-container.dark-mode {
    background-color: #0d1117;
    color: #c9d1d9;
  }

  .dark-mode .file-diff {
    border-color: #30363d;
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
    vertical-align: top;
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
    line-height: 1.5;
    word-break: break-all;
    overflow-wrap: anywhere;
  }

  .empty-line {
      background-color: #f6f8fa !important;
  }
  .dark-mode .empty-line {
      background-color: #161b22 !important;
  }

  /* Success/Addition Colors */
  .line-add .line-content, .add-content {
    background-color: #dafbe1;
  }
  .line-add .line-num, .add-bg {
    background-color: #ccffd8;
  }
  .dark-mode .line-add .line-content, .dark-mode .add-content {
    background-color: rgba(46, 160, 67, 0.15);
  }
  .dark-mode .line-add .line-num, .dark-mode .add-bg {
    background-color: rgba(46, 160, 67, 0.3);
  }

  /* Danger/Deletion Colors */
  .line-delete .line-content, .del-content {
    background-color: #ffebe9;
  }
  .line-delete .line-num, .del-bg {
    background-color: #ffdce0;
  }
  .dark-mode .line-delete .line-content, .dark-mode .del-content {
    background-color: rgba(248, 81, 70, 0.15);
  }
  .dark-mode .line-delete .line-num, .dark-mode .del-bg {
    background-color: rgba(248, 81, 70, 0.3);
  }

  /* Hunk Header Decor */
  .hunk-header .line-content {
    background-color: #f1f8ff;
    color: #0550ae;
    font-size: 0.9em;
  }
  .dark-mode .hunk-header .line-content {
    background-color: rgba(56, 139, 253, 0.1);
    color: #79c0ff;
    border-color: rgba(56, 139, 253, 0.2);
  }

  .sign {
    user-select: none;
    display: inline-block;
    width: 1.2em;
    opacity: 0.5;
    margin-right: 0.2em;
  }

  .split-row td {
      border-bottom: 1px solid rgba(0,0,0,0.03);
  }
  .dark-mode .split-row td {
      border-bottom-color: rgba(255,255,255,0.03);
  }

  table {
      table-layout: fixed;
  }
</style>
