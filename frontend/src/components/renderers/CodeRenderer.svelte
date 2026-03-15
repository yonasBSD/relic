<script>
  import MonacoEditor from '../MonacoEditor.svelte'
  import { createEventDispatcher } from 'svelte'
  import { createEventForwarder } from '../../services/utils/eventUtils'
  import { tryParseJson } from '../../services/utils/jsonRepair.js'

  export let processed
  export let relicId
  export let showSyntaxHighlighting
  export let showLineNumbers
  export let showComments = true
  export let fontSize = 13
  export let comments = []
  export let isAdmin = false
  export let darkMode = true
  export let beautify = false
  export let isFormattable = false

  const dispatch = createEventDispatcher()
  const forwardEvent = createEventForwarder(dispatch)

  $: language = (processed.type === 'code' || processed.type === 'diff') ? (processed.metadata?.language || 'plaintext') : 'plaintext'

  let beautifyRepaired = false

  function tryBeautify(content, lang) {
    beautifyRepaired = false
    try {
      if (lang === 'json') {
        const { value, repaired } = tryParseJson(content)
        beautifyRepaired = repaired
        return JSON.stringify(value, null, 2)
      }
      return content
    } catch {
      return content
    }
  }

  $: displayValue = (beautify && isFormattable)
    ? tryBeautify(processed.preview || processed.text || '', language)
    : (processed.preview || processed.text || '')
</script>

<div class="border-t border-gray-200">
  {#if beautify && beautifyRepaired}
    <div class="flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-700 font-medium">
      <i class="fas fa-wrench text-[10px]"></i>
      auto-repaired — displaying best-effort formatted output; stored relic is unchanged
    </div>
  {/if}
  <MonacoEditor
    value={displayValue}
    {language}
    readOnly={true}
    height="calc(100vh - 300px)"
    relicId={relicId}
    noWrapper={true}
    {showSyntaxHighlighting}
    {showLineNumbers}
    {showComments}
    {fontSize}
    {comments}
    {isAdmin}
    {darkMode}
    ansiDecorations={showSyntaxHighlighting && processed.hasAnsiCodes ? (processed.ansiDecorations || []) : []}
    on:line-clicked={forwardEvent}
    on:line-range-selected={forwardEvent}
    on:multi-line-selected={forwardEvent}
    on:line-copied={forwardEvent}
    on:createComment={forwardEvent}
    on:updateComment={forwardEvent}
    on:deleteComment={forwardEvent}
    on:toggle-comments={forwardEvent}
  />
</div>
{#if processed.truncated}
  <div class="bg-blue-50 border-t border-gray-200 px-6 py-4 text-center text-sm text-blue-700 rounded-b-lg">
    Content truncated. <a href="/{relicId}/raw" class="font-semibold hover:underline">Download full file</a>
  </div>
{/if}
