<script>
  import { createEventDispatcher } from "svelte";
  import Signatory from "./Signatory.svelte";
  export var contract = {
    templateName: "",
    module: "8",
    branchId: "",
    propertyId: "",
    zone: "2",
    status: "512",
  };
  $: contract.module = String(contract.module);
  $: contract.zone = String(contract.zone);
  $: contract.status = String(contract.status);
  const dispatch = createEventDispatcher();

  let showStatus = true;
  // let signatories = [{}];
  function cancel(e) {
    dispatch("cancel");
  }
  function finish() {
    dispatch("finish", {});
  }
  function handleSubmit(e) {
    var tag = {};
    // let signatories = [];
    const formData = new FormData(e.target);
    for (let field of formData) {
      const [key, value] = field;

      // Check if the key belongs to the 'signatory' fields
      if (key.startsWith("signatory[")) {
        // Extract the index and field (email or name) using a regular expression
        const match = key.match(/signatory\[(\d+)\]\.(email|name)/);
        if (match) {
          const index = match[1]; // The signatory index
          const fieldName = match[2]; // The field name (email or name)

          // // Ensure there's an object for this signatory
          // if (!signatories[index]) {
          //   signatories[index] = {};
          // }

          // // Assign the value to the correct field (email or name) of the corresponding signatory
          // signatories[index][fieldName] = value;
        }
      } else {
        // For other non-signatory fields, continue adding them normally to the 'tag' object
        tag[key] = value;
      }
    }

    // // Add the signatories array to the tag object
    // tag.signatories = signatories;

    tag["country"] = getCountryId();
    const validated = Object.values(tag).some((x) => x == null || x == "");
    // const signatoryValidated = signatories.some((signatory) => {
    //   return !signatory.email || !signatory.name; // true if any email or name is missing
    // });
    if (validated) {
      alert("All fields are required");
      return;
    }
    dispatch("finish", tag);
  }

  function handleFileChange(e) {
    if (e.target.value && e.target.value === "2") {
      showStatus = true;
    } else {
      showStatus = false;
    }
  }

  function getCountryId() {
    try {
      return parseInt(opener.parent.application.context.get_countryId());
    } catch (error) {
      return 65946;
    }
  }

  function addSignatory() {
    signatories = [...signatories, {}];
  }
  function removeSignatory(index) {
    signatories = signatories.filter((_, i) => i !== index);
  }
</script>

<div class="w-full h-full select-none mb-5">
  <form
    on:submit|preventDefault={handleSubmit}
    class="grid grid-cols-1 gap-2 mt-3 mx-auto container"
  >
    <div class="grid grid-cols-2 gap-2 h-16">
      <div>
        <label class="font-semibold text-xs">Template Name</label>
        <input
          class="px-4 bg-gray-200 mt-2 w-full"
          name="template_name"
          type="text"
          bind:value={contract.templateName}
        />
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Module</label>
        <select
          class="px-4 bg-gray-200 mt-2"
          name="module"
          bind:value={contract.module}
        >
          <option value="8">Property Management</option>
          <option value="2">Rent</option>
          <option value="1">Sale</option>
          <option value="13">Short Term Rental</option>
        </select>
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Branch Id</label>
        <input
          class="px-4 bg-gray-200 mt-2"
          name="branch_id"
          type="number"
          bind:value={contract.branchId}
        />
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Property Reference</label>
        <input
          class="px-4 bg-gray-200 mt-2"
          name="property_reference"
          type="number"
          bind:value={contract.propertyId}
        />
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">File</label>
        <select
          class="px-4 bg-gray-200 mt-2"
          name="file"
          on:change={handleFileChange}
          bind:value={contract.zone}
        >
          <option value="2">Unit</option>
          <option value="16">Maintenance Contract</option>
        </select>
      </div>

      {#if showStatus}
        <div class="flex flex-col">
          <label class="font-semibold text-xs">Status</label>
          <select
            class="px-4 bg-gray-200 mt-2"
            name="status"
            bind:value={contract.status}
          >
            <option value="512">UnPublished</option>
            <option value="1">Vacant</option>
            <option value="256">Blocked</option>
            <option value="2">Reserved</option>
            <option value="4">Sold</option>
          </select>
        </div>
      {/if}
      <div class="mr-4 mb-4 mt-5 flex col-start-1">
        <button
          type="button"
          on:click={cancel}
          class=" w-24 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4
              rounded mr-4"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="w-24 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4
              rounded"
        >
          Done
        </button>
      </div>
    </div>

    <!-- <div class="grid grid-cols-1 gap-2 h-auto">
      <h5
        class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
      >
        Signatories
      </h5>
      <div class="grid grid-cols-1 gap-2">
        {#each signatories as signatory, index}
          <Signatory {index} on:remove={() => removeSignatory(index)} />
        {/each}
      </div>

      <button type="button" class="float-end" on:click={addSignatory}>
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
            fill="#4caf50"
            d="M44,24c0,11.045-8.955,20-20,20S4,35.045,4,24S12.955,4,24,4S44,12.955,44,24z"
          ></path><path fill="#fff" d="M21,14h6v20h-6V14z"></path><path
            fill="#fff"
            d="M14,21h20v6H14V21z"
          ></path>
        </svg>
      </button>
    </div> -->
  </form>
</div>
