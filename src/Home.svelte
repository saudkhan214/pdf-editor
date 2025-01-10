<script>
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import Tailwind from "./Tailwind.svelte";
  import PDFPage from "./PDFPage.svelte";
  import Image from "./Image.svelte";
  import Text from "./Text.svelte";
  import Signatory from "./Signatory.svelte";
  import Drawing from "./Drawing.svelte";
  import DrawingCanvas from "./DrawingCanvas.svelte";
  import prepareAssets, { fetchFont } from "./utils/prepareAssets.js";
  // import { config } from "./utils/config";
  import { placeHolders } from "./utils/placeHolders";
  import {
    readAsImage,
    readAsPDF,
    readAsDataURL,
  } from "./utils/asyncReader.js";
  import { ggID } from "./utils/helper.js";
  import { save } from "./utils/PDF.js";
  import Setting from "./Setting.svelte";
  // import { link } from "svelte-routing";
  const genID = ggID();
  let pdfFile;
  let pdfName = "";
  let selectedEntity;
  let pages = [];
  let pagesScale = [];
  let allObjects = [];
  let signatories = [{}];
  let _placeholders = [];
  let currentFont = "Times-Roman";
  let focusId = null;
  let selectedPageIndex = -1;
  let saving = false;
  let openSaveDialogue = false;
  let addingDrawing = false;
  // let processingDone = false;
  // var pdfBlob;
  var _win;
  placeHolders.InsertEntity("Signatories");
  // for test purpose
  onMount(async () => {
    try {
      // const urlParams = new URLSearchParams(window.location.search);
      // const isProcessingMode = urlParams.get("processing") != null;
      // const resource_id = urlParams.get("resource_id");
      // const entity_id = urlParams.get("entity_id");
      // const entity_name = urlParams.get("entity_name");
      // if (isProcessingMode && resource_id) {
      //   var pdfJsonData = await fetchPdfResource(
      //     resource_id,
      //     entity_id,
      //     entity_name
      //   );
      //   const metaData = JSON.parse(pdfJsonData.metadata).map(
      //     (a) => a.filter((x) => x.type != "signatory") //ignore the signatory fields to be process
      //   );
      //   allObjects = metaData;
      //   const base64Pdf = pdfJsonData.pdf;
      //   const byteCharacters = atob(base64Pdf);
      //   const byteNumbers = new Array(byteCharacters.length)
      //     .fill(0)
      //     .map((_, i) => byteCharacters.charCodeAt(i));
      //   const byteArray = new Uint8Array(byteNumbers);
      //   pdfBlob = new Blob([byteArray], { type: "application/pdf" });
      //   pdfName = pdfJsonData.pdfName;
      //   await addPDF(pdfBlob);
      // }
      //const res = await fetch("/ejari_unified_tenancy_contract.pdf");
      //const pdfBlob = await res.blob();

      selectedPageIndex = 0;
      setTimeout(async () => {
        await fetchFont(currentFont);
        prepareAssets();
        // if (isProcessingMode) {
        //   // Create a 'mousedown' event
        //   const mouseDownEvent = new MouseEvent("mousedown", {
        //     bubbles: true, // Ensures the event propagates up the DOM
        //     cancelable: true,
        //     view: window,
        //   });

        //   // Dispatch the event on the div element
        //   _win.dispatchEvent(mouseDownEvent);
        //   await process(pdfFile, allObjects, pdfName, entity_id, entity_name);
        //   processingDone = true;
        // }
      }, 2000);
    } catch (e) {
      console.log(e);
    }
  });
  // async function fetchPdfResource(id, entity_id, entity_name) {
  //   var res = await fetch(
  //     `${config.API_HOST}/contract/get-pdf?resource_id=${id}&entity_name=${entity_name}&entity_id=${entity_id}`,
  //     {
  //       method: "GET",
  //     }
  //   );
  //   return await res.json();
  // }
  function addSignatory() {
    for (let i = 0; i < signatories.length; i++) {
      let signatory = signatories[i];
      if (!signatory.email || !signatory.name) {
        alert(
          `Please fill out both the email and name for signatory #${i + 1}`
        );
        return; // Stop function if validation fails
      }
    }

    signatories = [...signatories, {}];
  }
  function removeSignatory(index) {
    signatories = signatories.filter((_, i) => i !== index);
    placeHolders.RemoveChildren("Signatories", index);
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
  }
  async function onUploadPDF(e) {
    const files = e.target.files || (e.dataTransfer && e.dataTransfer.files);
    const file = files[0];
    if (!file || file.type !== "application/pdf") return;
    selectedPageIndex = -1;
    try {
      await addPDF(file);
      selectedPageIndex = 0;
    } catch (e) {
      console.log(e);
    }
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

      pagesScale = Array(numPages).fill(1);
    } catch (e) {
      console.log("Failed to add pdf.");
      throw e;
    }
  }
  async function onUploadImage(e) {
    const file = e.target.files[0];
    if (file && selectedPageIndex >= 0) {
      addImage(file);
    }
    e.target.value = null;
  }
  async function addImage(file) {
    try {
      // get dataURL to prevent canvas from tainted
      const url = await readAsDataURL(file);
      const img = await readAsImage(url);
      const id = genID();
      const { width, height } = img;
      const object = {
        id,
        type: "image",
        width,
        height,
        x: 0,
        y: 0,
        payload: img,
        file,
      };
      allObjects = allObjects.map((objects, pIndex) =>
        pIndex === selectedPageIndex ? [...objects, object] : objects
      );
    } catch (e) {
      console.log(`Fail to add image.`, e);
    }
  }
  function onAddTextField() {
    if (selectedPageIndex >= 0) {
      addTextField();
    }
  }
  function entityChange(e) {
    if (e.target.value) {
      _placeholders = placeHolders.GetChilderns(e.target.value);
      selectedEntity = e.target.value;
    }
  }
  async function placeHolderChange(e) {
    // const selectedOption = e.target.selectedOptions[0];
    // const dataObj = JSON.parse(selectedOption.dataset.obj);

    // let isSignatory = dataObj._case == "Signatories" ? true : false;
    // if (e.target.value) {
    // }
    await addTextField(e.target);
  }
  async function addTextField(target) {
    const selectedOption = target.selectedOptions[0];
    const dataObj = JSON.parse(selectedOption.dataset.obj);

    let text = target.value;
    text = `[${text}]`;
    const id = genID();
    await fetchFont(currentFont);

    let selectdPage = await pages[selectedPageIndex];
    const viewport = selectdPage.getViewport({ scale: 1, rotation: 0 });
    const pageHeight = viewport.height;

    const object = {
      id,
      text,
      type: "text",
      size: 16,
      width: 0, // recalculate after editing
      lineHeight: 1.4,
      fontWeight: 100,
      fontFamily: currentFont,
      x: 0,
      y: window.scrollY - pageHeight * selectedPageIndex + 45,
    };
    if (dataObj._case == "Signatory") {
      var signatory = signatories.find((a) => a.email == dataObj._datafield);
      if (signatory) {
        object.type = "signatory";
        object.signatory = signatory;
      }
    }
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex === selectedPageIndex ? [...objects, object] : objects
    );
  }
  function onAddDrawing() {
    if (selectedPageIndex >= 0) {
      addingDrawing = true;
    }
  }
  function addDrawing(originWidth, originHeight, path, scale = 1) {
    const id = genID();
    const object = {
      id,
      path,
      type: "drawing",
      x: 0,
      y: 0,
      originWidth,
      originHeight,
      width: originWidth * scale,
      scale,
    };
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex === selectedPageIndex ? [...objects, object] : objects
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
  function selectPage(index) {
    selectedPageIndex = index;
  }
  function updateObject(objectId, payload) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex == selectedPageIndex
        ? objects.map((object) =>
            object.id === objectId ? { ...object, ...payload } : object
          )
        : objects
    );
  }
  function deleteObject(objectId) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex == selectedPageIndex
        ? objects.filter((object) => object.id !== objectId)
        : objects
    );
  }
  function onMeasure(scale, i) {
    pagesScale[i] = scale;
  }
  function openSettingDialoge() {
    openSaveDialogue = true;
  }
  async function savePDF(tags) {
    if (!pdfFile || saving || !pages.length) return;
    try {
      saving = true;
      var result = await save(pdfFile, allObjects, tags, selectedEntity);
      if (result.success) {
        alert(result.msg);
        window.location.reload();
      } else {
        alert(result.error);
      }
    } catch (e) {
      console.log(e);
      alert(e.message);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:drop|preventDefault={onUploadPDF}
/>
<Tailwind />
<main
  class="flex flex-col items-center py-16 bg-gray-100 min-h-screen"
  bind:this={_win}
>
  <div
    class="fixed z-10 top-0 left-0 right-0 h-20 flex justify-center items-center
      bg-white"
  >
    <input
      type="file"
      name="pdf"
      id="pdf"
      on:change={onUploadPDF}
      class="hidden"
    />
    <input
      type="file"
      id="image"
      name="image"
      class="hidden"
      on:change={onUploadImage}
    />
    <label
      class="whitespace-no-wrap bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 md:px-4 rounded mr-3 cursor-pointer md:mr-4 mt-6"
      for="pdf"
    >
      Choose PDF
    </label>
    <!-- <div
        class="relative mr-3 flex h-8 bg-gray-400 rounded-sm overflow-hidden
        md:mr-4"
      >
        <label
          class="flex items-center justify-center h-full w-8 hover:bg-gray-500
          cursor-pointer"
          for="image"
          class:cursor-not-allowed={selectedPageIndex < 0}
          class:bg-gray-500={selectedPageIndex < 0}
        >
          <img src="image.svg" alt="An icon for adding images" />
        </label>
        <label
          class="flex items-center justify-center h-full w-8 hover:bg-gray-500
          cursor-pointer"
          for="text"
          class:cursor-not-allowed={selectedPageIndex < 0}
          class:bg-gray-500={selectedPageIndex < 0}
          on:click={onAddTextField}
        >
          <img src="notes.svg" alt="An icon for adding text" />
        </label>
        <label
          class="flex items-center justify-center h-full w-8 hover:bg-gray-500
          cursor-pointer"
          on:click={onAddDrawing}
          class:cursor-not-allowed={selectedPageIndex < 0}
          class:bg-gray-500={selectedPageIndex < 0}
        >
          <img src="gesture.svg" alt="An icon for adding drawing" />
        </label>
      </div> -->
      <!-- <a href="/editpdf/5646546544646" use:link replace>Replace this URL</a> -->
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
            <option
              data-obj={JSON.stringify(_placeholder)}
              value={_placeholder._name}>{_placeholder._name}</option
            >
          {/each}
        {/if}
      </select>
    </div>
    <button
      on:click={openSettingDialoge}
      class="w-20 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3
        md:px-4 mr-3 md:mr-4 rounded mt-6"
      class:cursor-not-allowed={pages.length === 0 || saving || !pdfFile}
      class:bg-blue-700={pages.length === 0 || saving || !pdfFile}
    >
      {saving ? "Saving" : "Save"}
    </button>
  </div>
  {#if addingDrawing}
    <div
      transition:fly={{ y: -200, duration: 500 }}
      class="fixed z-10 top-0 left-0 right-0 border-b border-gray-300 bg-white
        shadow-lg"
      style="height: 50%;"
    >
      <DrawingCanvas
        on:finish={(e) => {
          const { originWidth, originHeight, path } = e.detail;
          let scale = 1;
          if (originWidth > 500) {
            scale = 500 / originWidth;
          }
          addDrawing(originWidth, originHeight, path, scale);
          addingDrawing = false;
        }}
        on:cancel={() => (addingDrawing = false)}
      />
    </div>
  {/if}
  {#if openSaveDialogue}
    <div
      transition:fly={{ y: -200, duration: 500 }}
      class="fixed z-10 top-0 left-0 right-0 border-b border-gray-300 bg-white
    shadow-lg h-fit h-full overflow-scroll"
    >
      <Setting
        on:cancel={() => {
          saving = false;
          openSaveDialogue = false;
        }}
        on:finish={async (e) => {
          openSaveDialogue = false;
          await savePDF(e.detail);
        }}
      />
    </div>
  {/if}
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
                    <Image
                      on:update={(e) => updateObject(object.id, e.detail)}
                      on:delete={() => deleteObject(object.id)}
                      file={object.file}
                      payload={object.payload}
                      x={object.x}
                      y={object.y}
                      width={object.width}
                      height={object.height}
                      pageScale={pagesScale[pIndex]}
                    />
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
                      fontFamily={object.fontFamily}
                      fontWeight={object.fontWeight}
                      pageScale={pagesScale[pIndex]}
                    />
                  {:else if object.type === "drawing"}
                    <Drawing
                      on:update={(e) => updateObject(object.id, e.detail)}
                      on:delete={() => deleteObject(object.id)}
                      path={object.path}
                      x={object.x}
                      y={object.y}
                      width={object.width}
                      originWidth={object.originWidth}
                      originHeight={object.originHeight}
                      pageScale={pagesScale[pIndex]}
                    />
                  {/if}
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
      <div class="w-1/4">
        <h5
          class="mb-2 text-2xl font-bold text-gray-900 dark:text-white"
        >
          Signatories
        </h5>
        <div class="grid grid-cols-1 gap-2">
          {#each signatories as signatory, index}
            <Signatory
              {index}
              {_placeholders}
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
    </div>
  {:else}
    <div class="w-1/2 flex justify-center items-center border-4 border-dashed border-gray-500 mt-10 py-48">
      <span class=" font-bold text-3xl text-gray-500">Drag something here</span>
    </div>
  {/if}

  <!-- {#if processingDone}
      <span id="processing_done"></span>
    {/if} -->
</main>
