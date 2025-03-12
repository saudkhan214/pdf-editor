import { ggID, calculateObjectPosition } from "./helper.js";
import prepareAssets, { fetchFont } from "./prepareAssets.js";
import { readAsImage, readAsPDF, readAsDataURL } from "./asyncReader.js";
const genID = ggID();

export async function addTextField(
  target,
  pages,
  selectedPageIndex,
  allObjects,
  signatories,
  currentFont
) {
  const selectedOption = target.selectedOptions[0];
  const dataObj = JSON.parse(selectedOption.dataset.obj);

  let text = target.value;
  text = text === "Textbox" ? text : `[${text}]`;
  const id = genID();
  await fetchFont(currentFont);

  let selectdPage = await pages[selectedPageIndex];
  const viewport = selectdPage.getViewport({ scale: 1, rotation: 0 });
  const pageHeight = viewport.height;
  var objs = allObjects[selectedPageIndex];
  var yAxis = window.scrollY - pageHeight * selectedPageIndex + 45;
  const position = calculateObjectPosition(objs, yAxis, viewport.width, text);
  console.log(position);
  const object = {
    id,
    text,
    type: "text",
    lines: [text],
    size: 16,
    width: 0, // recalculate after editing
    lineHeight: 1.4,
    fontWeight: 100,
    fontFamily: currentFont,
    x: position.x,
    y: position.y,
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

  return { pages, allObjects };
}

export async function addCheckbox(
  target,
  pages,
  selectedPageIndex,
  allObjects
) {
  const selectedOption = target.selectedOptions[0];
  const dataObj = JSON.parse(selectedOption.dataset.obj);

  let text = "[]";
  const id = genID();

  let selectdPage = await pages[selectedPageIndex];
  const viewport = selectdPage.getViewport({ scale: 1, rotation: 0 });
  const pageHeight = viewport.height;
  var objs = allObjects[selectedPageIndex];
  var yAxis = window.scrollY - pageHeight * selectedPageIndex + 45;
  const position = calculateObjectPosition(objs, yAxis, viewport.width, text);
  console.log(position);
  const object = {
    id,
    type: "checkbox",
    width: 13,
    height: 13,
    checked: false,
    x: position.x,
    y: position.y,
  };
  allObjects = allObjects.map((objects, pIndex) =>
    pIndex === selectedPageIndex ? [...objects, object] : objects
  );

  return { pages, allObjects };
}

export function addDrawing(
  allObjects,
  selectedPageIndex,
  originWidth,
  originHeight,
  path,
  scale = 1
) {
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

export async function addPDF(
  file,
  pages,
  allObjects,
  pdfName,
  pdfFile,
  pagesScale
) {
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
  return { pages, allObjects, pdfName, pdfFile, pagesScale };
}

export async function addImage(file, allObjects, selectedPageIndex) {
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
