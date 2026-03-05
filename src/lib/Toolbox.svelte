<script>
  import { createEventDispatcher } from 'svelte';

  export let selectedTool = 'rect';
  const dispatch = createEventDispatcher();

  const shapeTools = [
    { id: 'rect',     label: '[rect]'     },
    { id: 'square',   label: '[square]'   },
    { id: 'circle',   label: '[circle]'   },
    { id: 'ellipse',  label: '[ellipse]'  },
    { id: 'triangle', label: '[tri]'      },
    { id: 'arc',      label: '[arc]'      },
    { id: 'chart',    label: '[chart]'    },
  ];

  function select(id) { selectedTool = id; }
  function clear() { dispatch('clear'); }
  function undo() { dispatch('undo'); }
  function redo() { dispatch('redo'); }
</script>

<nav class="toolbox" aria-label="Shape tools">
  {#each shapeTools as t}
    <button
      class="tool"
      class:active={selectedTool === t.id}
      on:click={() => select(t.id)}
      title={t.id}
    >{t.label}</button>
  {/each}

  <span class="sep">|</span>

  <button class="tool tool-action" on:click={undo} title="Undo (Ctrl+Z)">
    [undo]
  </button>
  <button class="tool tool-action" on:click={redo} title="Redo (Ctrl+Y)">
    [redo]
  </button>

  <span class="sep">|</span>

  <button class="tool tool-clear" on:click={clear} title="Clear canvas">
    [clear]
  </button>
</nav>

<style>
  .toolbox {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .tool {
    background: none;
    border: 1px solid var(--sienna);
    color: var(--sienna);
    font-size: 11px;
    padding: 2px 7px;
    letter-spacing: 0.03em;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
  }

  .tool:hover {
    background: var(--sienna);
    color: var(--bg);
  }

  .tool.active {
    background: var(--sienna);
    color: var(--bg);
  }

  .tool-action {
    border-color: var(--blue);
    color: var(--blue);
  }

  .tool-action:hover,
  .tool-action.active {
    background: var(--blue);
    color: var(--bg);
  }

  .tool-clear {
    border-color: var(--blue);
    color: var(--blue);
  }

  .tool-clear:hover {
    background: var(--blue);
    color: var(--bg);
  }

  .sep {
    color: var(--sienna);
    opacity: 0.4;
    font-size: 14px;
    user-select: none;
  }
</style>
