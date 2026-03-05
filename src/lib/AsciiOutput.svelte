<script>
  export let ascii = '';
</script>

<div class="ascii-panel">
  {#if ascii}
    <pre class="ascii-display">{ascii}</pre>
  {:else}
    <div class="empty">
      <span>draw something, then click [ convert &rarr; ]</span>
    </div>
  {/if}
</div>

<style>
  .ascii-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .ascii-display {
    flex: 1;
    overflow: auto;
    font-family: var(--font);
    font-size: 13px;
    line-height: 1.2;
    color: var(--blue);
    white-space: pre;
    tab-size: 1;
    padding: 10px 12px;
    user-select: all;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 0.03em;
  }
</style>
