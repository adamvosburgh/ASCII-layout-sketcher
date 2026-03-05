<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  function close() { dispatch('close'); }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="backdrop" on:click|self={close}>
  <div class="window" role="dialog" aria-modal="true" aria-label="How to use">
    <div class="title-bar">
      <span class="title">how to use</span>
      <button class="close-btn" on:click={close} title="Close">[x]</button>
    </div>
    <div class="content">
      <section>
        <h3>DRAW</h3>
        <p>select a shape tool (rect, circle, etc.), then drag on the canvas to place it.</p>
      </section>
      <section>
        <h3>LABEL</h3>
        <p>double-click any shape to add or edit a text label. double-click empty space to place a standalone text label. press enter or click away to confirm.</p>
      </section>
      <section>
        <h3>MOVE</h3>
        <p>hover over a shape's edge until the cursor changes, then drag to reposition it.</p>
      </section>
      <section>
        <h3>DELETE</h3>
        <p>right-click any shape to remove it from the canvas.</p>
      </section>
      <section>
        <h3>UNDO / REDO</h3>
        <p>ctrl+z to undo, ctrl+y to redo — or use the [undo] [redo] buttons in the toolbar.</p>
      </section>
      <section>
        <h3>CONVERT</h3>
        <p>click [convert →] to render your canvas as ASCII art. output is scaled to fit 80 characters wide — safe for terminals, code comments, and LLM prompts.</p>
      </section>
      <section>
        <h3>COPY</h3>
        <p>[copy w/ fences] wraps the output in ``` code fences for pasting directly into claude or other LLMs.</p>
        <p>[copy raw] gives plain ASCII text, no formatting.</p>
      </section>
      <section>
        <h3>CHART TOOL</h3>
        <p>the [chart] tool draws a grid layout. drag to define the area — it snaps to chart cell multiples. useful for representing tables or data grids.</p>
      </section>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .window {
    background: var(--bg);
    border: 1px solid var(--sienna);
    width: 440px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 4px 0 rgba(160, 82, 45, 0.15);
  }

  .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid var(--sienna);
    background: rgba(160, 82, 45, 0.04);
    flex-shrink: 0;
  }

  .title {
    color: var(--sienna);
    font-size: 12px;
    letter-spacing: 0.05em;
  }

  .close-btn {
    background: none;
    border: 1px solid var(--blue);
    color: var(--blue);
    font-family: var(--font);
    font-size: 11px;
    padding: 1px 6px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    letter-spacing: 0.03em;
  }

  .close-btn:hover {
    background: var(--blue);
    color: var(--bg);
  }

  .content {
    overflow-y: auto;
    padding: 16px 18px;
  }

  section {
    margin-bottom: 14px;
  }

  section:last-child {
    margin-bottom: 0;
  }

  h3 {
    color: var(--sienna);
    font-size: 10px;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }

  p {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.55;
    letter-spacing: 0.02em;
    margin-bottom: 3px;
  }

  p:last-child {
    margin-bottom: 0;
  }
</style>
