<script>
  import { onMount } from "svelte";
  import { config } from "./utils/config";
  import { processPdf, save } from "./utils/PDF.js";
  import prepareAssets, { fetchFont } from "./utils/prepareAssets.js";
  import PDFPage from "./PDFPage.svelte";
  import Text from "./Text.svelte";
  import Checkbox from "./Checkbox.svelte";
  import Tailwind from "./Tailwind.svelte";
  import { addPDF } from "./utils/sharedFunctions.js";
  let processingDone = false;
  let allObjects = [];
  let pagesScale = [];
  let pdfFile;
  var pdfBlob;
  let pdfName = "";
  let pages = [];
  let selectedPageIndex = -1;
  let entity_name;
  let entity_id;
  let isSigning;
  let currentFont = "Times-Roman";
  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isProcessingMode = urlParams.get("processing") != null;
      isSigning = urlParams.get("signing") != null;
      const resource_id = urlParams.get("resource_id");
      entity_id = urlParams.get("entity_id");
      entity_name = urlParams.get("entity_name");

      if (isProcessingMode && resource_id) {
        var pdfJsonData = await fetchPdfResource(
          resource_id,
          entity_id,
          entity_name
        );
        const metaData = JSON.parse(pdfJsonData.metadata).map(
          (a) => a.filter((x) => x.type != "signatory") //ignore the signatory fields to be process
        );
        allObjects = metaData;
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
        processingDone = true;
        // window.close();
      } else {
        alert("invalid state");
      }
    } catch (ex) {
      console.log(ex);
      alert("Some thing went wrong");
    }
  });

  async function downloadPdf() {
    await processPdf(
      pdfFile,
      allObjects,
      "Contract.pdf",
      entity_id,
      entity_name,
      isSigning
    );
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

{#if !processingDone}
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
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3
          md:px-4 mr-3 md:mr-4 rounded"
      >
        Download
      </button>
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
        <div class="w-1/4">
          <h5
            class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Signatories
          </h5>
          <div class="grid grid-cols-1 gap-2"></div>
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
