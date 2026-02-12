<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { config } from "./utils/config.js";
  export var contract = {
    id: 0,
    templateName: "",
    module: "",
    branchId: "",
    countryId: "",
    propertyId: "",
    zone: "",
    status: "512",
    useTransaction: false,
  };
  $: contract.module = String(contract.module);
  $: contract.zone = String(contract.zone);
  $: contract.status = String(contract.status);
  $: contract.branchId = String(contract.branchId);
  $: contract.countryId = String(contract.countryId);
  $: contract.propertyId = String(contract.propertyId);
  $: contract.useTransaction = Boolean(contract.useTransaction);

  $: isEditing = contract.id !== 0;

  contract.branchId = contract.branchId === null ? "" : contract.branchId;
  const dispatch = createEventDispatcher();

  let branches = [];
  let countries = [];
  let showStatus = true;

  onMount(() => {
  console.log("contract", contract);

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

    getGroupCountries()
      .then((data) => {
        console.log("Group Countries:", data);
        countries = data;
      })
      .catch((error) => {
        console.error("Error fetching group countries:", error);
        alert("Error fetching group countries");
      });
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
      contract.countryId == 0 ||
      (contract.zone == "2" && contract.status == "")
    ) {
      alert("Fill the required fields");
      return;
    }

    var tag = contract;
    tag["countryId"] = Number(contract.countryId);
    dispatch("finish", tag);
  }

  function copyContract() {
    dispatch("copy", contract);
  }
  function handleFileChange(e) {
    contract = {
      ...contract, // Clone the existing state
      zone: e.target.value, // Update zone explicitly
      status: e.target.value === "2" ? contract.status : "512", // set 512 for maintenance contract
      useTransaction: e.target.value === "2" ? contract.useTransaction : false, // set false for maintenance contract
    };
    showStatus = e.target.value === "2";
  }

  // function getCountryId() {
  //   try {
  //     return parseInt(opener.parent.application.context.get_countryId());
  //   } catch (error) {
  //     return 65946;
  //   }
  // }

  function getGroupCountries() {
    return new Promise((resolve, reject) => {
      fetch(config.API_HOST + "/group-countries", {
        method: "GET",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          console.error("Error fetching group countries:", error);
          reject(error);
        });
    });
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
      </div>

      <div class="flex flex-col">
        <label class="font-semibold text-xs">Country *</label>
        {#if countries.length}
          <select
            class="bg-white p-1 rounded-xs border mt-1 w-full"
            name="countryId"
            bind:value={contract.countryId}
          >
            <option disabled value="">--Select--</option>
            {#each countries as country}
              <option value={String(country.id)}>{country.name}</option>
            {/each}
          </select>
        {:else}
          <p>Loading countries...</p>
        {/if}
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
          <div class="p-1 flex items-center">
            <input
              id="checked-checkbox"
              type="checkbox"
              bind:checked={contract.useTransaction}
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              for="checked-checkbox"
              class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >Use Transaction</label
            >
          </div>
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
              rounded mr-4"
        >
          Done
        </button>
        {#if isEditing}
          <button
            type="button"
            on:click={copyContract}
            class="w-24 bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4
              rounded"
          >
            Copy
          </button>
        {/if}
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
