<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
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
  import { edit } from "./utils/PDF.js";
  import Setting from "./Setting.svelte";
  import { config } from "./utils/config";

  export let resource_id;

  const genID = ggID();
  let pdfFile;
  let pdfName = "";
  let pages = [];
  let pagesScale = [];
  let allObjects = [];
  let signatories = [{}];
  let _placeholders = [];
  let currentFont = "Times-Roman";
  let focusId = null;
  let contractInfo = null;
  let selectedPageIndex = -1;
  let saving = false;
  let openSaveDialogue = false;
  let addingDrawing = false;
  // let processingDone = false;
  var pdfBlob;
  var _win;
  placeHolders.InsertEntity("Signatories");
  // for test purpose
  onMount(async () => {
    try {
      if (resource_id) {
        var pdfJsonData = await fetchPdfResource(resource_id);
        // const metaData = JSON.parse(pdfJsonData.metadata).map(
        //   (a) => a.filter((x) => x.type != "signatory") //ignore the signatory fields to be process
        // );
        allObjects = JSON.parse(pdfJsonData.metadata);
        const base64Pdf = pdfJsonData.pdf;
        const byteCharacters = atob(base64Pdf);
        const byteNumbers = new Array(byteCharacters.length)
          .fill(0)
          .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        pdfBlob = new Blob([byteArray], { type: "application/pdf" });
        pdfName = pdfJsonData.pdfName;
        contractInfo = pdfJsonData.contract;
        await addPDF(pdfBlob);

        await fetchFont(currentFont);
        prepareAssets();
      } else {
        alert("Please provide Resource Id");
        window.close();
      }
    } catch (e) {
      alert(e.message)
      console.log(e);
    }
  });
  async function fetchPdfResource(id) {
    var res = await fetch(
      `${config.API_HOST}/contract/get-pdf?resource_id=${id}`,
      {
        method: "GET",
      }
    );
    return await res.json();
  }
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
    }
  }
  async function placeHolderChange(e) {
    // const selectedOption = e.target.selectedOptions[0];
    // const dataObj = JSON.parse(selectedOption.dataset.obj);

    // let isSignatory = dataObj._case == "Signatories" ? true : false;
    // if (e.target.value) {
    // }
    if (selectedPageIndex >= 0) {
      await addTextField(e.target);
    } else {
      alert("Please select a page first");
    }
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
    var maxId = allObjects[selectedPageIndex].length;
    object.id = maxId++;

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

    console.log(allObjects)
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
      var result = await edit(
        resource_id,
        pdfFile,
        allObjects,
        tags,
        contractInfo.id
      );
      if (result.success) {
        alert(result.msg);
        navigate("/", { replace: true });
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
    class="fixed z-10 top-0 left-0 right-0 h-12 flex justify-center items-center
        bg-gray-200 border-b border-gray-300"
  >
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
    <div class="flex flex-col justify-center md:mr-4">
      <label class="md:mr-2">Entities</label>
      <select on:change={entityChange}>
        <option disabled selected>--Select--</option>
        {#each placeHolders.Entities as entity, i (entity)}
          <option value={entity}>{entity}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col justify-center md:mr-4">
      <label class="md:mr-2">PlaceHolders</label>
      <select on:change={placeHolderChange}>
        <option disabled selected>--Select--</option>
        {#if _placeholders.length > 0}
          {#each _placeholders as _placeholder, i (_placeholder)}
            <option
              data-obj={JSON.stringify(_placeholder)}
              value={_placeholder._datafield}>{_placeholder._name}</option
            >
          {/each}
        {/if}
      </select>
    </div>
    <button
      on:click={openSettingDialoge}
      class="w-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3
          md:px-4 mr-3 md:mr-4 rounded"
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
        contract={contractInfo}
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
                      fontColor={object.fontColor}
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
          class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
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
              fill="#4caf50"
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
