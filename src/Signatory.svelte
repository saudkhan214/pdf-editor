<script>
  export let index; // Receive the index from the parent
  export let _placeholders = [];
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  // Store the values for multiple input fields
  let signatory = {
    email: "",
    name: "",
  };

  let showOptions = false; // Controls visibility of the options list
  let filteredOptions = _placeholders; // The filtered options based on user input
  let activeInput = ""; // Track the currently active input field

  // Toggle the dropdown for a specific input
  function toggleOptions(inputName) {
    // Set the active input and toggle the dropdown
    activeInput = inputName;
    showOptions = !showOptions;
  }

  // Select an option and set it to the active input field
  function selectOption(option) {
    signatory[activeInput] = option; // Set the selected option for the active input
    showOptions = false; // Hide the dropdown after selection

    handleInputChange(activeInput);
  }

  // Filter options based on input value (common for both input fields)
  function filterOptions() {
    const currentInputValue = signatory[activeInput];
    // if (currentInputValue == undefined) {
    //   return;
    // }

    // if (currentInputValue.trim() === "") {
    //   filteredOptions = _placeholders;
    // } else {
    //   filteredOptions = _placeholders.filter((option) =>
    //     option._name.toLowerCase().includes(currentInputValue.toLowerCase())
    //   );
    // }
  }

  // Watch for changes in the active input value to filter options
  $: filterOptions();

  // Function to remove this Signatory component
  function removeSignatory() {
    dispatch("remove");
  }
  function handleInputChange(activeInput) {
    dispatch("handle_input", {
      signatory,
      activeInput,
    });
  }
</script>

<div class="border border-gray-200 rounded-lg p-2 relative">
  <div class="grid grid-cols-2 grid-rows-1 gap-2">
    <div class="flex flex-col">
      <label class="font-semibold text-xs">Email</label>
      <input
        autocomplete="off"
        class="px-4 bg-gray-200 mt-2"
        name="signatory[{index}].email"
        type="text"
        bind:value={signatory.email}
        on:click={() => toggleOptions("email")}
      />
    </div>

    <div class="flex flex-col">
      <label class="font-semibold text-xs">Name</label>
      <input
        autocomplete="off"
        class="px-4 bg-gray-200 mt-2"
        name="signatory[{index}].name"
        type="text"
        bind:value={signatory.name}
        on:click={() => toggleOptions("name")}
      />
    </div>
  </div>

  {#if showOptions && _placeholders.length > 0}
    <ul
      class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1"
    >
      {#each _placeholders as option}
        <li
          class="px-4 py-2 cursor-pointer hover:bg-gray-200"
          on:click={() => selectOption(option._datafield)}
        >
          {option._name}
        </li>
      {/each}
    </ul>
  {/if}

  {#if index > 0}
    <button type="button" on:click={removeSignatory}>
      <svg
        class="w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="48"
        height="48"
        viewBox="0 0 48 48"
      >
        <path
          fill="#f44336"
          d="M44,24c0,11.045-8.955,20-20,20S4,35.045,4,24S12.955,4,24,4S44,12.955,44,24z"
        ></path>
        <path fill="#fff" d="M14,21h20v6H14V21z"></path>
      </svg>
    </button>
  {/if}
</div>

<style>
  ul {
    max-height: 200px; /* Set a max height for the dropdown */
    overflow-y: auto; /* Allow scrolling when there are too many options */
  }
</style>
