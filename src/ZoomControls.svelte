<script>
    import { onMount, onDestroy } from "svelte";
    export let zoom = 1;
    export let min = 0.5;
    export let max = 3;
    export let step = 0.1;

    onMount(() => {
        const handler = (e) => {
            if (e.ctrlKey && e.key === "+") zoomIn();
            if (e.ctrlKey && e.key === "-") zoomOut();
            if (e.ctrlKey && e.key === "0") reset();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    });

    export let onZoomChange = () => {};

    function zoomIn() {
        onZoomChange(Math.min(max, +(zoom + step).toFixed(2)));
    }

    function zoomOut() {
        onZoomChange(Math.max(min, +(zoom - step).toFixed(2)));
    }

    function reset() {
        onZoomChange(1);
    }
</script>

<div
    class="top-4 mr-3 z-50 flex items-center gap-2 bg-white p-2 rounded shadow"
>
    <button on:click={zoomOut}>−</button>
    <span class="min-w-[50px] text-center">
        {Math.round(zoom * 100)}%
    </span>
    <button on:click={zoomIn}>+</button>
    <button on:click={reset}>Reset</button>
</div>
