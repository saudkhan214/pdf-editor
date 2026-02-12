<script>
  import { onMount, onDestroy } from "svelte";

  export let page;
  export let scale = 1;

  let canvas;
  let renderTask;
  let mounted = false;
  let destroyed = false;

  async function render() {
    if (!mounted || !canvas || !page || destroyed) return;

    // Cancel previous render
    if (renderTask) {
      renderTask.cancel();
      renderTask = null;
    }

    const pdfPage = await page;
    if (destroyed) return;

    const context = canvas.getContext("2d");
    const viewport = pdfPage.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    renderTask = pdfPage.render({
      canvasContext: context,
      viewport
    });

    try {
      await renderTask.promise;
    } catch (err) {
      if (err.name !== "RenderingCancelledException") {
        console.error(err);
      }
    }
  }

  onMount(() => {
    mounted = true;
    render(); // ✅ force first render
  });

  // ✅ re-render when scale OR page changes
  $: if (mounted && scale && page) {
    render();
  }

  onDestroy(() => {
    destroyed = true;
    renderTask.cancel();
  });
</script>

<div>
  <canvas bind:this={canvas} class="max-w-full" />
</div>
