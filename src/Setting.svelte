<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { config } from "./utils/config.js";
  export var contract = {
    templateName: "",
    module: "",
    branchId: "",
    propertyId: "",
    zone: "",
    status: "",
  };
  $: contract.module = String(contract.module);
  $: contract.zone = String(contract.zone);
  $: contract.status = String(contract.status);
  $: contract.branchId = String(contract.branchId);
  $: contract.propertyId = String(contract.propertyId);

  contract.branchId = contract.branchId === null ? "" : contract.branchId;
  console.log("contract", contract);
  const dispatch = createEventDispatcher();

  let branches = [];
  let showStatus = true;

  onMount(() => {
    fetch(config.API_HOST + "/branches", {
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        branches = data;
      })
      .catch((error) => {
        console.error("Error fetching branches:", error);
        alert("Error fetching branches");
      });

    if (contract.zone != "2") {
      showStatus = false;
    }
  });
  // let signatories = [{}];
  function cancel(e) {
    dispatch("cancel");
  }
  function finish() {
    dispatch("finish", {});
  }
  function handleSubmit(e) {
    if (
      contract.templateName == "" ||
      contract.module == "" ||
      contract.zone == "" ||
      (contract.zone == "2" && contract.status == "")
    ) {
      alert("Fill the required fields");
      return;
    }

    var tag = contract;
    // let signatories = [];
    // const formData = new FormData(e.target);
    // for (let field of formData) {
    //   const [key, value] = field;

    //   // Check if the key belongs to the 'signatory' fields
    //   if (key.startsWith("signatory[")) {
    //     // Extract the index and field (email or name) using a regular expression
    //     const match = key.match(/signatory\[(\d+)\]\.(email|name)/);
    //     if (match) {
    //       const index = match[1]; // The signatory index
    //       const fieldName = match[2]; // The field name (email or name)

    //       // Ensure there's an object for this signatory
    //       if (!signatories[index]) {
    //         signatories[index] = {};
    //       }

    //       // Assign the value to the correct field (email or name) of the corresponding signatory
    //       signatories[index][fieldName] = value;
    //     }
    //   }
    //   // else {
    //   //   // For other non-signatory fields, continue adding them normally to the 'tag' object
    //   //   // if (key == "branch_id" || key == "property_reference") {
    //   //   //   continue;
    //   //   // }

    //   //   tag[key] = value;
    //   // }
    // }

    tag["country"] = getCountryId();
    dispatch("finish", tag);
  }

  function handleFileChange(e) {
    contract = {
      ...contract, // Clone the existing state
      zone: e.target.value, // Update zone explicitly
      status: e.target.value === "2" ? contract.status : "", // Clear status only when needed
    };
    showStatus = e.target.value === "2";
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
        <label class="font-semibold text-xs">Template Name *</label>
        <input
          class="bg-white p-1 rounded-xs border mt-1 w-full"
          name="templateName"
          type="text"
          bind:value={contract.templateName}
        />
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Module *</label>
        <select
          class="bg-white p-1 rounded-xs border mt-2 w-full"
          name="module"
          bind:value={contract.module}
        >
          <option selected disabled value="">--Select--</option>
          <option value="8">Property Management</option>
          <option value="2">Rent</option>
          <option value="1">Sale</option>
          <option value="13">Short Term Rental</option>
        </select>
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Branch Id</label>
        {#if branches.length}
          <select
            class="bg-white p-1 rounded-xs border mt-1 w-full"
            name="branchId"
            bind:value={contract.branchId}
          >
            <option disabled value="">--Select--</option>
            {#each branches as branch}
              <option value={String(branch.id)}>{branch.name}</option>
            {/each}
          </select>
        {:else}
          <p>Loading branches...</p>
        {/if}
        <!-- <input
          class="bg-white p-1 rounded-xs border mt-1 w-full"
          name="branchId"
          type="number"
          bind:value={contract.branchId}
        /> -->
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Property Reference</label>
        <input
          class="bg-white p-1 rounded-xs border mt-1 w-full"
          name="propertyId"
          type="number"
          bind:value={contract.propertyId}
        />
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">File *</label>
        <select
          class="bg-white p-1 rounded-xs border mt-1 w-full"
          name="zone"
          on:change={handleFileChange}
          bind:value={contract.zone}
        >
          <option selected disabled>--Select--</option>
          <option value="2">Unit</option>
          <option value="16">Maintenance Contract</option>
        </select>
      </div>

      {#if showStatus}
        <div class="flex flex-col">
          <label class="font-semibold text-xs">Status *</label>
          <select
            class="bg-white p-1 rounded-xs border mt-1 w-full"
            name="status"
            bind:value={contract.status}
          >
            <option selected disabled>--Select--</option>
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
          class="w-24 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4
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
            fill="#1f7bc1"
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
