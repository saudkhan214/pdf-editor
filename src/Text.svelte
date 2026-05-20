<svelte:options immutable={true} />

<script>
  import { onMount, createEventDispatcher } from "svelte";
  import Toolbar from "./Toolbar.svelte";
  import { pannable } from "./utils/pannable.js";
  import { tapout } from "./utils/tapout.js";
  import { timeout } from "./utils/helper.js";
  import { Fonts } from "./utils/prepareAssets.js";
  export let size;
  export let fontWeight;
  export let text;
  export let lineHeight;
  export let x;
  export let y;
  export let fontFamily;
  export let fontColor;
  export let pageScale = 1;
  export let charLimit = 80;
  export let dir = "ltr";
  const Families = Object.keys(Fonts);
  const dispatch = createEventDispatcher();
  let startX;
  let startY;
  let editable;
  let _size = size;
  let _fontWeight = fontWeight;
  let _lineHeight = lineHeight;
  let _fontFamily = fontFamily;
  let _fontColor = fontColor;
  let dx = 0;
  let dy = 0;
  let operation = "";
  let _charLimit = charLimit;
  let _dir = dir;
  const basePath = process.env.BASE_PATH;
  function handlePanMove(event) {
    dx = (event.detail.x - startX) / pageScale;
    dy = (event.detail.y - startY) / pageScale;
  }

  $: if (charLimit) {
    _charLimit = charLimit;
  }
  $: if (dir) {
    _dir = dir;
  }
  function handlePanEnd(event) {
    if (dx === 0 && dy === 0) {
      return editable.focus();
    }
    const currentLimit = parseInt(_charLimit) || 100;
    dispatch("update", {
      x: x + dx,
      y: y + dy,
      lines: extractLines(),
      charLimit: currentLimit,
      dir: _dir,
      text: editable.textContent,
    });
    dx = 0;
    dy = 0;
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
  async function onBlur() {
    if (operation !== "edit" || operation === "tool") return;
    editable.blur();
    sanitize();
    const currentLimit = parseInt(_charLimit) || 100;
    const newLines = extractLines();
    dispatch("update", {
      lines: newLines,
      charLimit: currentLimit,
      dir: _dir,
      text: editable.textContent,
    });
    operation = "";
  }
  async function onPaste(e) {
    // get text only
    const pastedText = e.clipboardData.getData("text");
    document.execCommand("insertHTML", false, pastedText);
    // await tick() is not enough
    await timeout();
    sanitize();
  }
  function onKeydown(e) {
    const childNodes = Array.from(editable.childNodes);
    if (e.keyCode === 13) {
      // prevent default adding div behavior
      e.preventDefault();
      const selection = window.getSelection();
      const focusNode = selection.focusNode;
      const focusOffset = selection.focusOffset;
      // the caret is at an empty line
      if (focusNode === editable) {
        editable.insertBefore(
          document.createElement("br"),
          childNodes[focusOffset],
        );
      } else if (focusNode instanceof HTMLBRElement) {
        editable.insertBefore(document.createElement("br"), focusNode);
      }
      // the caret is at a text line but not end
      else if (focusNode.textContent.length !== focusOffset) {
        document.execCommand("insertHTML", false, "<br>");
        // the carat is at the end of a text line
      } else {
        let br = focusNode.nextSibling;
        if (br) {
          editable.insertBefore(document.createElement("br"), br);
        } else {
          br = editable.appendChild(document.createElement("br"));
          br = editable.appendChild(document.createElement("br"));
        }
        // set selection to new line
        selection.collapse(br, 0);
      }
    }
  }
  function onFocusTool() {
    operation = "tool";
  }
  async function onBlurTool() {
    if (operation !== "tool" || operation === "edit") return;
    const currentLimit = parseInt(_charLimit) || 80;
    dispatch("update", {
      lines: extractLines(),
      lineHeight: _lineHeight,
      size: _size,
      fontFamily: _fontFamily,
      charLimit: currentLimit,
      dir: _dir,
      fontColor: _fontColor,
      fontWeight: _fontWeight,
    });
    operation = "";
  }
  function sanitize() {
    let weirdNode;
    while (
      (weirdNode = Array.from(editable.childNodes).find(
        (node) => !["#text", "BR"].includes(node.nodeName),
      ))
    ) {
      editable.removeChild(weirdNode);
    }
  }
  function onChangeFont() {
    dispatch("selectFont", {
      name: _fontFamily,
    });
  }
  function onChangeColor() {
    dispatch("update", {
      fontColor: _fontColor,
    });
  }
  function render() {
    const limit = parseInt(_charLimit) || 80;
    const displayText = text && text.trim() ? text : "Text Box";
    const formatted = formatTextForDisplay(displayText, limit);
    editable.innerHTML = formatted;
  }
  function extractLines() {
    const textContent = editable.textContent || "";
    const cleanText = textContent.replace(/\s+/g, " ");
    const lines = [];
    const limit = parseInt(_charLimit) || 80;
    for (let i = 0; i < cleanText.length; i += limit) {
      const chunk = cleanText.substring(i, i + limit);
      lines.push(chunk);
    }
    return {
      lines: lines.length > 0 ? lines : [""],
      dir: _dir,
    };
  }

  function formatTextForDisplay(rawText, limit) {
    if (!rawText || !rawText.trim()) return "Text Box";
    const cleanText = rawText.replace(/\s+/g, " ").trim();
    const words = cleanText.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      if (word.length >= limit) {
        if (currentLine !== "") {
          lines.push(currentLine);
          currentLine = "";
        }
        lines.push(word);
        return;
      }

      const testLine = currentLine === "" ? word : currentLine + " " + word;

      if (testLine.length <= limit) {
        currentLine = testLine;
      } else {
        if (currentLine !== "") lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine !== "") lines.push(currentLine);
    return lines.length > 0 ? lines.join("<br>") : "Text Box";
  }
  function onDelete() {
    dispatch("delete");
  }
  onMount(render);
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
      <div class="mr-2 flex items-center">
        <span class="text-xs mr-1">Limit:</span>
        <input
          type="number"
          min="1"
          max="500"
          class="h-6 w-12 text-center rounded-sm"
          bind:value={_charLimit}
          on:change={() =>
            dispatch("update", { charLimit: parseInt(_charLimit) })}
        />
      </div>
      <div class="mr-2 flex items-center">
        <img
          src={`${basePath}line_height.svg`}
          class="w-6 mr-2"
          alt="Line height"
        />
        <input
          type="number"
          min="1"
          max="10"
          step="0.1"
          class="h-6 w-12 text-center flex-shrink-0 rounded-sm"
          bind:value={_lineHeight}
        />
      </div>
      <div class="mr-2 flex items-center">
        <img src={`${basePath}text.svg`} class="w-6 mr-2" alt="Font size" />
        <input
          type="number"
          min="6"
          max="120"
          step="1"
          class="h-6 w-12 text-center flex-shrink-0 rounded-sm"
          bind:value={_size}
        />
      </div>
      <div class="mr-2 flex items-center">
        <img
          src={`${basePath}text-family.svg`}
          class="w-4 mr-2"
          alt="Font family"
        />
        <div class="relative w-32 md:w-40">
          <select
            bind:value={_fontFamily}
            on:change={onChangeFont}
            class="font-family"
          >
            {#each Families as family}
              <option value={family}>{family}</option>
            {/each}
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex
            items-center px-2 text-gray-700"
          >
            <svg
              class="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757
                6.586 4.343 8z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div class="mr-2 flex items-center">
        <img
          src={`${basePath}font-weight.svg`}
          class="w-4 mr-2"
          alt="Font family"
        />
        <select bind:value={_fontWeight}>
          <option value="100">Normal</option>
          <option value="600">Bold</option>
          <option value="800">Bolder</option>
        </select>
      </div>
      <div class="mr-2 flex items-center">
        <input type="color" bind:value={_fontColor} on:input={onChangeColor} />
      </div>
      <div class="mr-2 flex items-center border-l border-gray-400 pl-2">
        <button
          type="button"
          class="px-2 py-1 text-xs border rounded-l {_dir === 'ltr'
            ? 'bg-blue-500 text-white'
            : 'bg-white'}"
          on:click={() => {
            _dir = "ltr";
            console.log("Direction changed to LTR");
          }}
        >
          LTR
        </button>
        <button
          type="button"
          class="px-2 py-1 text-xs border rounded-r {_dir === 'rtl'
            ? 'bg-blue-500 text-white'
            : 'bg-white'}"
          on:click={() => {
            _dir = "rtl";
            console.log("Direction changed to RTL");
          }}
        >
          RTL
        </button>
      </div>
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
    class="absolute w-full h-full cursor-grab border border-dotted
     border-gray-500"
    class:cursor-grab={!operation}
    class:cursor-grabbing={operation === "move"}
    class:editing={["edit", "tool"].includes(operation)}
  />
  <div
    bind:this={editable}
    on:focus={onFocus}
    on:keydown={onKeydown}
    on:paste|preventDefault={onPaste}
    contenteditable="true"
    spellcheck="false"
    class="outline-none"
    style="
    font-size: {_size}px; 
    font-family: '{_fontFamily}', serif;
    line-height: {_lineHeight}; 
    color: {_fontColor}; 
    font-weight: {_fontWeight};
    -webkit-user-select: text;
    width: {_charLimit * (_size * 0.6)}px; 
    min-width: 100px;
    word-break: break-all;      
    overflow-wrap: break-word; 
    white-space: pre-wrap;     
    text-align: {_dir === 'rtl' ? 'right' : 'left'};
    display: block;
  "
  />
</div>

<style>
  .editing {
    @apply pointer-events-none border-gray-800 border-dashed;
  }
  .font-family {
    @apply block appearance-none h-6 w-full bg-white pl-2 pr-8 rounded-sm leading-tight;
  }
</style>
