<script>
  import { onMount } from "svelte";
  import { config } from "./utils/config";
  import { processPdf, save } from "./utils/PDF.js";
  import prepareAssets, { fetchFont } from "./utils/prepareAssets.js";
  import {
    readAsArrayBuffer,
    readAsImage,
    readAsPDF,
    readAsDataURL,
  } from "./utils/asyncReader.js";

  let processingDone = false;
  let allObjects = [];
  let pdfFile;
  var pdfBlob;
  let pdfName = "";
  let pages = [];
  let currentFont = "Times-Roman";
  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isProcessingMode = urlParams.get("processing") != null;
      const isSigning = urlParams.get("signing") != null;
      const resource_id = urlParams.get("resource_id");
      const entity_id = urlParams.get("entity_id");
      const entity_name = urlParams.get("entity_name");

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
        await addPDF(pdfBlob);

        await fetchFont(currentFont);
        prepareAssets();
        await processPdf(
          pdfFile,
          allObjects,
          "Contract.pdf",
          entity_id,
          entity_name,
          isSigning
        );
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

  async function fetchPdfResource(id, entity_id, entity_name) {
    var res = await fetch(
      `${config.API_HOST}/contract/get-pdf?resource_id=${id}&entity_name=${entity_name}&entity_id=${entity_id}`,
      {
        method: "GET",
      }
    );
    return await res.json();
  }
  async function addPDF(file) {
    try {
      const pdf = await readAsPDF(file);
      if (file.name) {
        pdfName = file.name;
      }
      pdfFile = file;
      const numPages = pdf.numPages;
      pages = Array(numPages)
        .fill()
        .map((_, i) => pdf.getPage(i + 1));
      allObjects =
        Array.isArray(allObjects) && allObjects.some((obj) => obj)
          ? allObjects
          : pages.map(() => []);

      //   pagesScale = Array(numPages).fill(1);
    } catch (e) {
      console.log("Failed to add pdf.");
      throw e;
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
{/if}
