<script>
  import { onMount, onDestroy } from "svelte";
  import { config } from "./utils/config";
  import { processPdf, downloadPdf } from "./utils/PDF.js";
  import prepareAssets, { fetchFont } from "./utils/prepareAssets.js";
  import PDFPage from "./PDFPage.svelte";
  import Text from "./Text.svelte";
  import Checkbox from "./Checkbox.svelte";
  import Stamp from "./Stamp.svelte";
  import Signatory from "./Signatory.svelte";
  import Tailwind from "./Tailwind.svelte";
  import {
    addPDF,
    validateEmail,
    addTextField,
    addStamp,
  } from "./utils/sharedFunctions.js";
  import { placeHolders } from "./utils/placeHolders";
  import Recipient from "./Recipient.svelte";
  import ZoomControls from "./ZoomControls.svelte";
  let zoom = 1;
  let pageLoaded = false;
  let selectedEntity;
  let pdfProcessing = false;
  let allObjects = [];
  let pagesScale = [];
  let signatories = [{}];
  let _placeholders = [];
  let pdfFile;
  var pdfBlob;
  let pdfName = "";
  let pages = [];
  let selectedPageIndex = -1;
  let entity_name;
  let entity_id;
  let document_id;
  let resource_id;
  let hasSignatory = false;
  let signRequested = false;
  let signCompleted = false;
  let signedPdfUrl = "";
  let currentFont = "Times-Roman";
  let signatureProviders = [];
  let selectedSignatureProvider;
  let recipientSigningStatus;
  let carbonCopies = [];
  placeHolders.InsertEntity("Signatories");
  placeHolders.RemoveExcept(["Signatories"]);

  $: hasSignatory =
    signatories.length > 0 &&
    !signatories.some((obj) => Object.keys(obj).length === 0);
  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      document_id = urlParams.get("document_id");
      entity_id = urlParams.get("entity_id");
      entity_name = urlParams.get("entity_name");

      var pdfJsonData = await fetchPdfResource(
        entity_id,
        entity_name,
        document_id,
      );
      // console.log("pdfJsonData", pdfJsonData);
      signatureProviders = pdfJsonData.signatureProviders;
      if (pdfJsonData.signedContract) {
        signRequested = pdfJsonData.signedContract.sentForSignature;
        signCompleted = pdfJsonData.signedContract.signedOn;
        signedPdfUrl = pdfJsonData.signedContract.contractUrl;
      }
      recipientSigningStatus = pdfJsonData.recipientSigningStatus;
      var declined = declinedBySignatory(recipientSigningStatus);
      if (declined) {
        signRequested = false; //reinitiate the signing flow
      }
      resource_id = pdfJsonData.resourceId;

      const base64Pdf = pdfJsonData.pdf;
      const byteCharacters = atob(base64Pdf);
      const byteNumbers = new Array(byteCharacters.length)
        .fill(0)
        .map((_, i) => byteCharacters.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);
      pdfBlob = new Blob([byteArray], { type: "application/pdf" });
      pdfName = pdfJsonData.pdfName;
      ({ pages, allObjects, pdfName, pdfFile, pagesScale } = await addPDF(
        pdfBlob,
        pages,
        allObjects,
        pdfName,
        pdfFile,
        pagesScale,
      ));

      await fetchFont(currentFont);
      prepareAssets();
      pageLoaded = true;
      window.addEventListener("message", handleMessage);
      // window.close();
    } catch (ex) {
      console.log(ex);
      alert(ex.message);
    }
  });

  onDestroy(() => {
    window.removeEventListener("message", handleMessage);
  });
  function setZoom(value) {
    zoom = value;
  }

  function declinedBySignatory(recipientSigningStatus) {
    if (!recipientSigningStatus || !Array.isArray(recipientSigningStatus))
      return false;
    return recipientSigningStatus.some(
      (recipient) =>
        recipient.status && recipient.status.toLowerCase() === "declined",
    );
  }
  async function handleDownloadPdf() {
    pdfProcessing = true;
    try {
      let pdfBytes = await processPdf(pdfFile, allObjects);
      downloadPdf(pdfBytes, "Contract.pdf");
    } catch (e) {
      console.log(e);
      alert("Some thing went wrong");
    } finally {
      pdfProcessing = false;
    }
  }
  async function sendForSignature() {
    pdfProcessing = true;
    const hasSignatoryInObjects = allObjects.some((pageObjects) =>
      pageObjects.some((obj) => obj.type === "signatory"),
    );
    if (!hasSignatoryInObjects) {
      alert(
        "Please add at least one signatory to the document before sending for signature.",
      );
      return;
    }

    try {
      var saved = await savePdfMetadata();
      if (!saved) {
        throw new Error("Failed to save pdf metadata");
      }

      //refector the processPdf, the pupose of processPdf should only be process the pdf and return the blob
      let pdfBytes = await processPdf(pdfFile, allObjects);
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const baseUrl = `${config.API_HOST}/signpdf/${selectedSignatureProvider}`;

      var data = new FormData();
      data.append("pdf", pdfBlob, `${resource_id}.pdf`);
      data.append("entityName", entity_name);
      data.append("entityId", entity_id);
      data.append("contractId", 0);
      data.append("resourceId", resource_id);
      data.append("documentId", document_id);
      data.append("carbonCopies", JSON.stringify(carbonCopies));
      data.append("metaData", JSON.stringify(allObjects));

      var res = await fetch(baseUrl, {
        method: "POST",
        body: data,
      });
      var data = await res.json();
      if (data.status == true) {
        if (data.redirect) {
          window.docSignWindow = window.open(
            data.redirect,
            "PDF Signature",
            "width=400,height=600",
          );
          if (window.docSignWindow) {
            window.docSignWindow.focus();
          } else {
            alert("Please allow popups for this website.");
          }
        } else {
          alert(
            data.message +
              " \n" +
              "Please wait for couple of minutes then check your email",
          );
        }
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.log(e);
      alert("Some thing went wrong");
    } finally {
      window.location.reload();
      pdfProcessing = false;
    }
  }

  async function savePdfMetadata() {
    const baseUrl = `${config.API_HOST}/contract/save-pdf-metadata`;

    var data = new FormData();
    data.append("entityName", entity_name);
    data.append("entityId", entity_id);
    data.append("resourceId", resource_id);
    data.append("metaData", JSON.stringify(allObjects));

    var res = await fetch(baseUrl, {
      method: "POST",
      body: data,
    });

    return res.ok;
  }
  function handleMessage(event) {
    // Optional: add origin check for security
    const allowedOrigin = new URL(config.API_HOST).origin.trim();
    const eventOrigin = event.origin.trim();
    console.log("Allowed Origin:", allowedOrigin);
    console.log("Event Origin:", eventOrigin);
    if (eventOrigin !== allowedOrigin) {
      console.warn("Received message from unauthorized origin:", event.origin);
      return;
    }

    if (window.docSignWindow) {
      window.docSignWindow.close();
      window.docSignWindow = null;
    }

    console.log("Received postMessage:", event.data);
    alert(
      event.data.message
        ? event.data.message
        : "Some thing went wrong during signing process.",
    );
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  async function fetchPdfResource(entity_id, entity_name, doc_id) {
    var res = await fetch(
      `${config.API_HOST}/contract/get-xpdf?entity_name=${entity_name}&entity_id=${entity_id}&document_id=${doc_id}`,
      {
        method: "GET",
      },
    );
    var text = await res.text();
    if (!res.ok) {
      console.log("Failed to fetch pdf resource", text);
      throw new Error(text);
    }
    return JSON.parse(text);
  }

  function selectPage(index) {
    selectedPageIndex = index;
  }

  function onMeasure(scale, i) {
    pagesScale[i] = scale;
  }

  function updateObject(objectId, payload) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex == selectedPageIndex
        ? objects.map((object) =>
            object.id === objectId ? { ...object, ...payload } : object,
          )
        : objects,
    );
  }
  function deleteObject(objectId) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex == selectedPageIndex
        ? objects.filter((object) => object.id !== objectId)
        : objects,
    );
  }
  async function selectFontFamily(event) {
    const name = event.detail.name;
    try {
      await fetchFont(name);
      currentFont = name;
    } catch {
      alert("Some thing went wrong");
    }
  }

  function openDocument(inputUrl) {
    let url = inputUrl.includes("localhost")
      ? inputUrl.replace(/^https:\/\//, "http://")
      : inputUrl;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch file");
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank"); // Open in new tab
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Could not load document.");
      });
  }

  function formatDate(dateStr) {
    if (!dateStr || new Date(dateStr).getFullYear() === 1) {
      return "N/A";
    }
    return new Date(dateStr).toLocaleString(); // Or your desired format
  }

  function removeCc(index) {
    carbonCopies = carbonCopies.filter((_, i) => i !== index);
  }
  function handleCcInput({ detail }, index) {
    if (
      detail.activeInput === "email" &&
      !validateEmail(detail.signatory.email)
    ) {
      alert("Please enter a valid email address.");

      detail.signatory.email = "";
      carbonCopies[index] = { ...detail.signatory };
      return;
    }
    carbonCopies[index] = detail.signatory;
  }

  function addCc() {
    for (let i = 0; i < carbonCopies.length; i++) {
      let cc = carbonCopies[i];
      if (!cc.email || !cc.name) {
        alert(`Please fill out both the email and name for cc #${i + 1}`);
        return; // Stop function if validation fails
      }
    }

    carbonCopies = [...carbonCopies, {}];
  }

  function addSignatory() {
    for (let i = 0; i < signatories.length; i++) {
      let signatory = signatories[i];
      if (!signatory.email || !signatory.name) {
        alert(
          `Please fill out both the email and name for signatory #${i + 1}`,
        );
        return; // Stop function if validation fails
      }
    }

    signatories = [...signatories, {}];
  }

  function removeSignatory(index) {
    signatories = signatories.filter((_, i) => i !== index);
    placeHolders.RemoveChildren("Signatories", index);
    _placeholders = placeHolders.GetChilderns(selectedEntity);
  }
  function handleSignatoryInput({ detail }, index) {
    signatories[index] = detail.signatory;

    if (detail.signatory.email && detail.activeInput == "email") {
      placeHolders.InsertChildren("Signatories", [
        {
          _name: detail.signatory.email,
          _datafield: detail.signatory.email,
          _case: "Signatory",
        },
      ]);
    }
    _placeholders = placeHolders.GetChilderns(selectedEntity);
  }

  function entityChange(e) {
    if (e.target.value) {
      _placeholders = placeHolders.GetChilderns(e.target.value);
      selectedEntity = e.target.value;
    }
  }
  async function placeHolderChange(e) {
    if (selectedPageIndex >= 0) {
      if (e.target.value === "Checkbox") {
        ({ pages, allObjects } = await addCheckbox(
          e.target,
          pages,
          selectedPageIndex,
          allObjects,
        ));
      } else {
        ({ pages, allObjects } = await addTextField(
          e.target,
          pages,
          selectedPageIndex,
          allObjects,
          signatories,
          currentFont,
        ));
      }
      e.target.value = "";
    } else {
      alert("Please select a page first");
    }
  }

  function updateStamp(objectId, stampIndex, updatedStamp) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex === selectedPageIndex
        ? objects.map((object) => {
            if (object.id === objectId) {
              const stamps = (
                object.signatory && Array.isArray(object.signatory.stamps)
                  ? object.signatory.stamps
                  : []
              ).map((stamp, index) =>
                index === stampIndex ? { ...stamp, ...updatedStamp } : stamp,
              );

              return {
                ...object,
                signatory: {
                  ...(object.signatory || {}),
                  stamps: stamps,
                },
              };
            }
            return object;
          })
        : objects,
    );
  }

  function deleteStamp(objectId, stampIndex) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex === selectedPageIndex
        ? objects.map((object) => {
            if (object.id === objectId) {
              const stamps =
                object.signatory && Array.isArray(object.signatory.stamps)
                  ? object.signatory.stamps.filter(
                      (_, index) => index !== stampIndex,
                    )
                  : [];

              return {
                ...object,
                signatory: {
                  ...(object.signatory || {}),
                  stamps: stamps,
                },
              };
            }
            return object;
          })
        : objects,
    );
  }
  async function handleStamp(object) {
    ({ pages, allObjects } = await addStamp(
      object,
      pages,
      selectedPageIndex,
      allObjects,
    ));
  }
</script>

{#if !pageLoaded}
  <div
    class="absolute bg-white bg-opacity-60 z-10 h-full w-full flex items-center justify-center"
  >
    <div class="flex items-center">
      <span class="text-3xl mr-4">Loading</span>
      <!-- loading icon -->
      <svg
        class="animate-spin h-5 w-5 text-gray-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <!-- end loading icon -->
    </div>
  </div>
{:else}
  <Tailwind />
  <main class="flex flex-col items-center py-16 bg-gray-100 min-h-screen">
    <div
      class="fixed z-10 top-0 left-0 right-0 h-20 flex justify-center items-center
      bg-white"
    >
      {#if !signRequested}
        <div class="flex flex-col justify-center md:mr-4">
          <label class="md:mr-2">Entities</label>
          <select on:change={entityChange} class="p-1 rounded-xs border">
            <option disabled selected>--Select--</option>
            {#each placeHolders.Entities as entity, i (entity)}
              <option value={entity}>{entity}</option>
            {/each}
          </select>
        </div>
        <div class="flex flex-col justify-center md:mr-4">
          <label class="md:mr-2">PlaceHolders</label>
          <select on:change={placeHolderChange} class="p-1 rounded-xs border">
            <option disabled selected>--Select--</option>
            {#if _placeholders.length > 0}
              {#each _placeholders as _placeholder, i (_placeholder)}
                {#if _placeholder._name}
                  <option
                    data-obj={JSON.stringify(_placeholder)}
                    value={_placeholder._name}>{_placeholder._name}</option
                  >
                {/if}
              {/each}
            {/if}
          </select>
        </div>
      {/if}

      <button
        on:click={handleDownloadPdf}
        disabled={pdfProcessing}
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3
          md:px-4 mr-3 md:mr-4 rounded {pdfProcessing
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'}"
      >
        Download
      </button>
      <ZoomControls {zoom} onZoomChange={setZoom} />
      {#if hasSignatory && !signRequested && signatureProviders.length > 0}
        <button
          on:click={sendForSignature}
          disabled={pdfProcessing}
          class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3
        md:px-4 mr-3 md:mr-4 rounded {pdfProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'}"
        >
          Send For Signature
        </button>
        <select
          class="p-1 rounded-xs border"
          bind:value={selectedSignatureProvider}
        >
          {#each signatureProviders as provider, index (index)}
            <option value={provider}>{provider.toUpperCase()}</option>
          {/each}
        </select>
      {:else if signRequested && !signCompleted}
        <span class="text-green-600 font-bold">
          PDF has been sent for signature.
        </span>
      {:else if signCompleted}
        <span class="text-green-600 font-bold">
          PDF has been signed. You can download it{" "}
          <button
            on:click={() => openDocument(signedPdfUrl)}
            target="_blank"
            rel="noopener noreferrer"
            class="underline text-blue-600"
          >
            here
          </button>
        </span>
      {/if}
    </div>

    {#if pages.length}
      <div class="flex px-1 gap-2 mt-8">
        <div class="flex-1">
          {#each pages as page, pIndex (page)}
            <div
              class="p-1 w-full flex flex-col items-center overflow-hidden"
              on:mousedown={() => selectPage(pIndex)}
              on:touchstart={() => selectPage(pIndex)}
            >
              <div
                class="relative shadow-lg"
                class:shadow-outline={pIndex === selectedPageIndex}
              >
                <PDFPage
                  scale={pagesScale[pIndex]}
                  on:measure={(e) => onMeasure(e.detail.scale, pIndex)}
                  {page}
                />
                <div
                  class="absolute top-0 left-0 transform origin-top-left"
                  style="transform: scale({pagesScale[
                    pIndex
                  ]}); touch-action: none;"
                >
                  {#each allObjects[pIndex] as object (object.id)}
                    {#if object.type === "image"}
                      <div></div>
                    {:else if object.type === "text"}
                      <Text
                        on:update={(e) => updateObject(object.id, e.detail)}
                        on:delete={() => deleteObject(object.id)}
                        on:selectFont={selectFontFamily}
                        text={object.text}
                        x={object.x}
                        y={object.y}
                        size={object.size}
                        lineHeight={object.lineHeight}
                        fontColor={object.fontColor}
                        fontFamily={object.fontFamily}
                        fontWeight={object.fontWeight}
                        pageScale={pagesScale[pIndex]}
                      />
                    {:else if object.type === "signatory"}
                      <Signatory
                        on:update={(e) => updateObject(object.id, e.detail)}
                        on:delete={() => deleteObject(object.id)}
                        on:stamp={() => handleStamp(object)}
                        text={object.text}
                        x={object.x}
                        y={object.y}
                        pageScale={pagesScale[pIndex]}
                      />
                      {#if object.signatory.stamps}
                        {#each object.signatory.stamps as stamp, i}
                          <Stamp
                            on:update={(e) =>
                              updateStamp(object.id, i, e.detail)}
                            on:delete={() => deleteStamp(object.id, i)}
                            x={stamp.x}
                            y={stamp.y}
                            pageScale={pagesScale[pIndex]}
                          />
                        {/each}
                      {/if}
                    {:else if object.type === "checkbox"}
                      <Checkbox
                        on:update={(e) => updateObject(object.id, e.detail)}
                        on:delete={() => deleteObject(object.id)}
                        x={object.x}
                        y={object.y}
                        pageScale={pagesScale[pIndex]}
                        isChecked={object.checked}
                      />
                    {:else if object.type === "drawing"}
                      <div></div>
                    {/if}
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>
        <div class="p-6">
          {#if !signRequested}
            <div
              class="w-full max-w-sm bg-white shadow-md rounded-lg border border-gray-200 p-4 space-y-4 mb-4"
            >
              <h5 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                Receives a Copy
              </h5>
              <div class="grid grid-cols-1 gap-2">
                {#each carbonCopies as cc, index}
                  <Recipient
                    {index}
                    on:remove={() => removeCc(index)}
                    on:handle_input={(e) => handleCcInput(e, index)}
                  />
                {/each}
              </div>

              <button type="button" class="float-end" on:click={addCc}>
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
            </div>

            <div
              class="w-full max-w-sm bg-white shadow-md rounded-lg border border-gray-200 p-4 space-y-4"
            >
              <h5 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                Signatories
              </h5>
              <div class="grid grid-cols-1 gap-2">
                {#each signatories as signatory, index}
                  <Recipient
                    {index}
                    on:remove={() => removeSignatory(index)}
                    on:handle_input={(e) => handleSignatoryInput(e, index)}
                  />
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
            </div>
          {/if}
          {#if recipientSigningStatus}
            <div
              class="w-full max-w-sm bg-white shadow-md rounded-lg border border-gray-200 p-4 space-y-4"
            >
              <h2 class="text-lg font-semibold border-b pb-2">
                Recipients Signing Status
              </h2>
              {#each recipientSigningStatus as recipient}
                <div
                  class="text-sm border-b last:border-none pb-2 mb-2 last:mb-0"
                >
                  <p>
                    <span class="font-medium">Name:</span>
                    {recipient.recipientName}
                  </p>
                  <p>
                    <span class="font-medium">Email:</span>
                    {recipient.recipientEmail}
                  </p>
                  <p>
                    <span class="font-medium">Status:</span>
                    <span class="text-green-600">
                      {recipient.status
                        ? recipient.status.toUpperCase()
                        : "Pending"}
                    </span>
                  </p>
                  {#if recipient.declinedReason}
                    <p>
                      <span class="font-medium">Declined Reason:</span>
                    </p>
                    <p
                      class="text-red-600 break-words max-w-xs whitespace-pre-line"
                    >
                      {recipient.declinedReason}
                    </p>
                  {/if}
                  {#if recipient.sentAt}
                    <p>
                      <span class="font-medium">Sent At:</span>
                      {formatDate(recipient.sentAt)}
                    </p>
                  {/if}
                  {#if recipient.signedAt}
                    <p>
                      <span class="font-medium">Signed At:</span>
                      {formatDate(recipient.signedAt)}
                    </p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div
        class="absolute bg-white bg-opacity-60 z-10 h-full w-full flex items-center justify-center"
      >
        <div class="flex items-center">
          <span class="text-3xl mr-4">Loading</span>
          <!-- loading icon -->
          <svg
            class="animate-spin h-5 w-5 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <!-- end loading icon -->
        </div>
      </div>
    {/if}
  </main>
{/if}
