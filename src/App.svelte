<script>
  import './app.css';
  import Canvas from './lib/Canvas.svelte';
  import Toolbox from './lib/Toolbox.svelte';
  import AsciiOutput from './lib/AsciiOutput.svelte';
  import HowToUse from './lib/HowToUse.svelte';
  import { convertToAscii } from './lib/ascii/converter.js';

  // Shared shape store — shapes are plain objects
  let shapes = [];
  let selectedTool = 'rect';
  let asciiResult = '';
  let canvasRef;  // bound to Canvas component instance

  // How to use modal — show on first load
  let showHowToUse = true;

  // Copy state
  let copied = false;
  let copyTimer;

  $: charWidth = asciiResult ? asciiResult.split('\n')[0].length : 0;

  function handleShapesChange(event) {
    shapes = event.detail;
  }

  function handleConvert() {
    asciiResult = convertToAscii(shapes);
  }

  function handleClear() {
    canvasRef?.clearCanvas();
    asciiResult = '';
  }

  function handleUndo() {
    canvasRef?.undo();
  }

  function handleRedo() {
    canvasRef?.redo();
  }

  function copyWithFences() {
    if (!asciiResult) return;
    const text = '```\n' + asciiResult + '\n```';
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copied = false; }, 1800);
    });
  }

  function copyRaw() {
    if (!asciiResult) return;
    navigator.clipboard.writeText(asciiResult).then(() => {
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copied = false; }, 1800);
    });
  }
</script>

{#if showHowToUse}
  <HowToUse on:close={() => showHowToUse = false} />
{/if}

<div class="layout">
  <!-- ── LEFT PANEL: drawing area ── -->
  <div class="panel panel-left">
    <header class="panel-header">
      <div class="header-title">
        <span class="site-title">ascii drawing converter</span>
      </div>
      <div class="header-buttons">
        <Toolbox bind:selectedTool on:clear={handleClear} on:undo={handleUndo} on:redo={handleRedo} />
      </div>
      <div class="header-hint">move = drag edges &nbsp;|&nbsp; rclick = delete &nbsp;|&nbsp; dblclick = label</div>
    </header>
    <div class="canvas-wrap">
      <Canvas
        bind:this={canvasRef}
        bind:shapes
        {selectedTool}
        on:change={handleShapesChange}
      />
    </div>
  </div>

  <!-- ── DIVIDER ── -->
  <div class="divider" aria-hidden="true">
    {#each Array(200) as _}
      <span>:</span>
    {/each}
  </div>

  <!-- ── RIGHT PANEL: ASCII output ── -->
  <div class="panel panel-right">
    <header class="panel-header">
      <div class="header-title">
        <button class="btn-convert" on:click={handleConvert}>[ convert &rarr; ]</button>
        <button class="btn-how" on:click={() => showHowToUse = true}>[ how to use ]</button>
      </div>
      <div class="header-buttons">
        <button class="btn-copy" on:click={copyWithFences} disabled={!asciiResult} title="Copy wrapped in ``` for pasting into Claude / LLM prompts">
          {copied ? '[ copied! ]' : '[ copy w/ fences ]'}
        </button>
        <button class="btn-copy btn-copy-raw" on:click={copyRaw} disabled={!asciiResult} title="Copy plain ASCII">
          [ copy raw ]
        </button>
      </div>
      <div class="header-hint">{#if charWidth}{charWidth} chars wide{/if}</div>
    </header>
    <AsciiOutput ascii={asciiResult} />
  </div>
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  /* ── panels ── */
  .panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--sienna);
    flex-shrink: 0;
  }

  /* row 1: title / main action */
  .header-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px 5px;
  }

  /* row 2: tool / action buttons */
  .header-buttons {
    display: flex;
    align-items: center;
    padding: 0 12px 5px;
    gap: 6px;
  }

  /* row 3: description hint */
  .header-hint {
    padding: 0 12px 6px;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.02em;
    white-space: nowrap;
    min-height: 16px; /* keeps both sides same height when hint is empty */
  }

  .site-title {
    color: var(--sienna);
    font-size: 11px;
    letter-spacing: 0.05em;
    white-space: nowrap;
    /* match button height: same padding + invisible border */
    display: inline-block;
    padding: 3px 0;
    border: 1px solid transparent;
  }

  .canvas-wrap {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: var(--bg);
  }

  /* ── dotted divider ── */
  .divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--blue);
    font-size: 14px;
    line-height: 1.4;
    padding: 0 2px;
    overflow: hidden;
    user-select: none;
    flex-shrink: 0;
    border-left: 1px dotted var(--blue);
    border-right: 1px dotted var(--blue);
    width: 10px;
  }

  .divider span {
    display: block;
    line-height: 1;
  }

  /* ── convert button (blue) ── */
  .btn-convert {
    background: none;
    border: 1px solid var(--blue);
    color: var(--blue);
    font-family: var(--font);
    font-size: 12px;
    padding: 3px 10px;
    letter-spacing: 0.04em;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .btn-convert:hover {
    background: var(--blue);
    color: var(--bg);
  }

  /* ── copy buttons ── */
  .btn-copy {
    background: none;
    border: 1px solid var(--sienna);
    color: var(--sienna);
    font-family: var(--font);
    font-size: 11px;
    padding: 2px 8px;
    letter-spacing: 0.03em;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
  }

  .btn-copy:hover:not(:disabled) {
    background: var(--sienna);
    color: var(--bg);
  }

  .btn-copy:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .btn-copy-raw {
    border-color: var(--blue);
    color: var(--blue);
  }

  .btn-copy-raw:hover:not(:disabled) {
    background: var(--blue);
    color: var(--bg);
  }

  /* ── how to use button (sienna) ── */
  .btn-how {
    background: none;
    border: 1px solid var(--sienna);
    color: var(--sienna);
    font-family: var(--font);
    font-size: 12px;
    padding: 3px 10px;
    letter-spacing: 0.04em;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .btn-how:hover {
    background: var(--sienna);
    color: var(--bg);
  }
</style>
