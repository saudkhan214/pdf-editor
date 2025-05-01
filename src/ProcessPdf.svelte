<script>
  import { onMount, onDestroy } from "svelte";
  import { config } from "./utils/config";
  import { processPdf, save } from "./utils/PDF.js";
  import prepareAssets, { fetchFont } from "./utils/prepareAssets.js";
  import PDFPage from "./PDFPage.svelte";
  import Text from "./Text.svelte";
  import Checkbox from "./Checkbox.svelte";
  import Tailwind from "./Tailwind.svelte";
  import { addPDF } from "./utils/sharedFunctions.js";
  let pageLoaded = false;
  let pdfProcessing = false;
  let allObjects = [];
  let pagesScale = [];
  let pdfFile;
  var pdfBlob;
  let pdfName = "";
  let pages = [];
  let selectedPageIndex = -1;
  let entity_name;
  let entity_id;
  let resource_id;
  let user_id;
  let group_id;
  // let isSigning;
  let hasSignatory = false;
  let signRequested = false;
  let signCompleted = false;
  let signedPdfUrl = "";
  let currentFont = "Times-Roman";
  let signatureProviders = [];
  let docSignWindow;
  let selectedSignatureProvider;
  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isProcessingMode = urlParams.get("processing") != null;
      // isSigning = urlParams.get("signing") != null;
      resource_id = urlParams.get("resource_id");
      entity_id = urlParams.get("entity_id");
      entity_name = urlParams.get("entity_name");

      if (isProcessingMode && resource_id) {
        var pdfJsonData = await fetchPdfResource(
          resource_id,
          entity_id,
          entity_name
        );
        // console.log("pdfJsonData", pdfJsonData);
        signatureProviders = pdfJsonData.signatureProviders;
        if (pdfJsonData.pdfMetadata["sign_requested"]) {
          signRequested =
            pdfJsonData.pdfMetadata["sign_requested"].toLowerCase() === "true";
        }
        if (pdfJsonData.pdfMetadata["signed"]) {
          signCompleted =
            pdfJsonData.pdfMetadata["signed"].toLowerCase() === "true";
        }
        if (pdfJsonData.pdfMetadata["signed_pdf_url"]) {
          signedPdfUrl = pdfJsonData.pdfMetadata["signed_pdf_url"];
        }
        const metaData = JSON.parse(pdfJsonData.jsonMetadata).map((a) => {
          // Check if any item in the array has type === "signatory"
          if (
            a.some((x) => x.type === "signatory") &&
            signatureProviders.length > 0
          ) {
            hasSignatory = true;
          }

          // Return the array without signatory items
          return a.filter((x) => x.type !== "signatory");
        });
        allObjects = metaData;
        const base64Pdf = pdfJsonData.pdf;
        user_id = pdfJsonData.userId;
        group_id = pdfJsonData.groupId;
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
          pagesScale
        ));

        await fetchFont(currentFont);
        prepareAssets();
        // await processPdf(
        //   pdfFile,
        //   allObjects,
        //   "Contract.pdf",
        //   entity_id,
        //   entity_name,
        //   isSigning
        // );
        pageLoaded = true;
        window.addEventListener("message", handleMessage);
        // window.close();
      } else {
        alert("invalid state");
      }
    } catch (ex) {
      console.log(ex);
      alert("Some thing went wrong");
    }
  });

  onDestroy(() => {
    window.removeEventListener("message", handleMessage);
  });

  async function downloadPdf() {
    pdfProcessing = true;
    await processPdf(
      pdfFile,
      allObjects,
      "Contract.pdf",
      entity_id,
      entity_name,
      false
    );
    pdfProcessing = false;
  }
  async function sendForSignature() {
    pdfProcessing = true;
    await processPdf(
      pdfFile,
      allObjects,
      `${resource_id}.pdf`,
      entity_id,
      entity_name,
      true
    );
    setTimeout(() => {
      const baseUrl = `${config.API_HOST}/signpdf/${selectedSignatureProvider}`;
      const params = new URLSearchParams({
        resource_id,
        entity_name,
        entity_id,
        user_id,
        group_id,
      });

      const fullUrl = `${baseUrl}?${params.toString()}`;
      console.log("fullUrl", fullUrl);
      docSignWindow = window.open(
        fullUrl,
        "PDF Signature",
        "width=400,height=600"
      );
    }, 3000);
  }

  function handleMessage(event) {
    // Optional: add origin check for security
    if (event.origin !== config.API_HOST.replace("/api", "")) {
      console.warn("Received message from unauthorized origin:", event.origin);
      return;
    }

    if (docSignWindow) {
      docSignWindow.close();
      docSignWindow = null;
    }

    console.log("Received postMessage:", event.data);
    alert(event.data.message);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  async function fetchPdfResource(id, entity_id, entity_name) {
    var res = await fetch(
      `${config.API_HOST}/contract/get-pdf?resource_id=${id}&entity_name=${entity_name}&entity_id=${entity_id}`,
      {
        method: "GET",
      }
    );
    return await res.json();
  }
  // async function addPDF(file) {
  //   try {
  //     const pdf = await readAsPDF(file);
  //     if (file.name) {
  //       pdfName = file.name;
  //     }
  //     pdfFile = file;
  //     const numPages = pdf.numPages;
  //     pages = Array(numPages)
  //       .fill()
  //       .map((_, i) => pdf.getPage(i + 1));
  //     allObjects =
  //       Array.isArray(allObjects) && allObjects.some((obj) => obj)
  //         ? allObjects
  //         : pages.map(() => []);

  //     //   pagesScale = Array(numPages).fill(1);
  //   } catch (e) {
  //     console.log("Failed to add pdf.");
  //     throw e;
  //   }
  // }

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
            object.id === objectId ? { ...object, ...payload } : object
          )
        : objects
    );

    console.log(allObjects);
  }
  function deleteObject(objectId) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex == selectedPageIndex
        ? objects.filter((object) => object.id !== objectId)
        : objects
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
      class="fixed z-10 top-0 left-0 right-0 h-12 flex justify-center items-center
        bg-gray-200 border-b border-gray-300"
    >
      <button
        on:click={downloadPdf}
        disabled={pdfProcessing}
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3
          md:px-4 mr-3 md:mr-4 rounded {pdfProcessing
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'}"
      >
        Download
      </button>
      {#if hasSignatory && !signRequested}
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
          <a
            href={signedPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="underline text-blue-600"
          >
            here
          </a>
        </span>
      {/if}
    </div>

    {#if pages.length}
      <div class="flex px-1 gap-2">
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
                    {:else if object.type === "text" || object.type === "signatory"}
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
