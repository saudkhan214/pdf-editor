<svelte:options immutable={true} />

<script>
  import { onMount, createEventDispatcher } from "svelte";
  import Toolbar from "./Toolbar.svelte";
  import { tapout } from "./utils/tapout.js";
  import { pannable } from "./utils/pannable.js";
  export let x;
  export let y;
  export let pageScale = 1;
  export let isChecked = false;
  let startX;
  let startY;
  let editable;
  let dx = 0;
  let dy = 0;
  let operation = "";
  const dispatch = createEventDispatcher();
  const basePath = process.env.BASE_PATH;
  function handlePanMove(event) {
    dx = (event.detail.x - startX) / pageScale;
    dy = (event.detail.y - startY) / pageScale;
  }

  function handlePanEnd(event) {
    console.log("enter handlePanEnd");
    if (dx === 0 && dy === 0) {
      return editable.focus();
    }
    dispatch("update", {
      x: x + dx,
      y: y + dy,
      width: editable.clientWidth,
      height: editable.clientHeight
    });
    dx = 0;
    dy = 0;
    operation = "";

    console.log("end handlePanEnd");
  }
  async function onBlur() {
    if (operation !== "edit" || operation === "tool") return;
    editable.blur();
    dispatch("update", {
      checked: isChecked,
    });
    operation = "";
  }
  function handlePanStart(event) {
    startX = event.detail.x;
    startY = event.detail.y;
    operation = "move";
  }
  function onFocus() {
    operation = "edit";
  }
  function onFocusTool() {
    operation = "tool";
  }
  async function onBlurTool() {
    if (operation !== "tool" || operation === "edit") return;
    dispatch("update", {
      checked: isChecked,
    });
    operation = "";
  }
  function onDelete() {
    dispatch("delete");
  }

  function toggleCheckbox() {
    isChecked = !isChecked;
  }
</script>

{#if operation}
  <Toolbar>
    <div
      use:tapout
      on:tapout={onBlurTool}
      on:mousedown={onFocusTool}
      on:touchstart={onFocusTool}
      class="h-full flex justify-center items-center bg-gray-300 border-b
      border-gray-400"
    >
      <div
        on:click={toggleCheckbox}
        class="w-5 h-5 cursor-pointer m-4"
        style="background-color: {isChecked ? 'blue' : 'white'}"
      ></div>
      <div
        on:click={onDelete}
        class="w-5 h-5 rounded-full bg-white cursor-pointer"
      >
        <img
          class="w-full h-full"
          src={`${basePath}delete.svg`}
          alt="delete object"
        />
      </div>
    </div>
  </Toolbar>
{/if}
<div
  use:tapout
  on:tapout={onBlur}
  class="absolute left-0 top-0 select-none"
  style="transform: translate({x + dx}px, {y + dy}px);"
>
  <div
    use:pannable
    on:panstart={handlePanStart}
    on:panmove={handlePanMove}
    on:panend={handlePanEnd}
    class="absolute w-full h-full cursor-grab"
    class:cursor-grab={!operation}
    class:cursor-grabbing={operation === "move"}
    class:editing={["edit", "tool"].includes(operation)}
  />
  <!-- <div
    bind:this={editable}
    on:focus={onFocus}
    contenteditable="true"
    spellcheck="false"
    class="outline-none whitespace-no-wrap"
  /> -->
  <input
    bind:this={editable}
    bind:checked={isChecked}
    on:focus={onFocus}
    type="checkbox"
  />
</div>
