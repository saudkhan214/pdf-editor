import { readAsArrayBuffer } from "./asyncReader.js";
import { fetchFont, getAsset } from "./prepareAssets";
import { noop } from "./helper.js";
import { config } from "./config.js";
const basePath = process.env.BASE_PATH;

export async function save(pdfFile, objects, tags, entityName) {
  var data = new FormData();
  data.append("pdf", pdfFile);
  data.append("is_processed_pdf", false);
  data.append("tags", JSON.stringify(tags));
  data.append("entityName", entityName);
  data.append("metaData", JSON.stringify(objects));
  try {
    var res = await fetch(`${config.API_HOST}/contract/save-pdf`, {
      method: "POST",
      body: data,
    });
    if (res.status != 200) {
      const error = await res.json();
      console.log(error);
      return { error: error.error, success: false };
    }
    return { msg: "Pdf data saved", success: true };
  } catch (ex) {
    console.log(ex);
    return { error: ex.message, success: false };
  }
}

export async function edit(resource_id, pdfFile, objects, tags, contract_id) {
  var data = new FormData();
  data.append("pdf", pdfFile);
  data.append("resourceId", resource_id);
  data.append("contractId", contract_id);
  data.append("tags", JSON.stringify(tags));
  data.append("metaData", JSON.stringify(objects));
  try {
    var res = await fetch(`${config.API_HOST}/contract/update-pdf`, {
      method: "POST",
      body: data,
    });
    if (res.status != 200) {
      const error = await res.json();
      console.log(error);
      return { error: error.error, success: false };
    }
    return { msg: "Pdf updated", success: true };
  } catch (ex) {
    console.log(ex);
    return { error: ex.message, success: false };
  }
}
export function downloadPdf(pdfBytes, name) {
  download(pdfBytes, name, "application/pdf");
}
export async function processPdf(
  pdfFile,
  objects
) {
  const PDFLib = await getAsset("PDFLib");
  const download = await getAsset("download");
  const makeTextPDF = await getAsset("makeTextPDF");
  let pdfDoc;
  try {
    pdfDoc = await PDFLib.PDFDocument.load(await readAsArrayBuffer(pdfFile));
  } catch (e) {
    console.log("Failed to load PDF.");
    throw e;
  }
  const pagesProcesses = pdfDoc.getPages().map(async (page, pageIndex) => {
    const pageObjects = objects[pageIndex];
    // 'y' starts from bottom in PDFLib, use this to calculate y
    const pageHeight = page.getHeight();
    const embedProcesses = pageObjects.map(async (object) => {
      if (object.type === "image") {
        let { file, x, y, width, height } = object;
        let img;
        try {
          if (file.type === "image/jpeg") {
            img = await pdfDoc.embedJpg(await readAsArrayBuffer(file));
          } else {
            img = await pdfDoc.embedPng(await readAsArrayBuffer(file));
          }
          return () =>
            page.drawImage(img, {
              x,
              y: pageHeight - y - height,
              width,
              height,
            });
        } catch (e) {
          console.log("Failed to embed image.", e);
          return noop;
        }
      } else if (object.type === "checkbox") {
        let { x, y, width, height, checked } = object;
        const pngUrl = checked
          ? "checkbox_checked.png"
          : "checkbox_unchecked.png";
        const imageBytes = await fetch(basePath + pngUrl).then((res) =>
          res.arrayBuffer()
        );

        const pngImage = await pdfDoc.embedPng(imageBytes);
        return () => {
          page.drawImage(pngImage, {
            x,
            y: pageHeight - y - height - 5,
            width: width,
            height: height,
          });
          // const svgPath = checked
          //   ? "M4,4 H20 V20 H4 Z M6,12 L10,16 L18,8"
          //   : "M4,4 H20 V20 H4 Z";

          // page.drawSvgPath(svgPath, {
          //   x,
          //   y: pageHeight - y - height,
          //   borderColor: PDFLib.rgb(0, 0, 0),
          //   borderWidth: 2,
          // });

          // page.drawRectangle({
          //   x,
          //   y: pageHeight - y - height,
          //   width,
          //   height,
          //   color: checked ? PDFLib.rgb(0, 0, 0) : PDFLib.rgb(1, 1, 1),
          // });
        };
      } else if (object.type === "text") {
        let { x, y, lines, lineHeight, size, fontFamily, width, fontColor } =
          object;
        const height = size * lineHeight * (lines ? lines.length : 1);
        const font = await fetchFont(fontFamily);
        width = getTextWidth(lines, width) + 5;
        const [textPage] = await pdfDoc.embedPdf(
          await makeTextPDF({
            lines,
            fontSize: size,
            lineHeight,
            width,
            height,
            font: font.buffer || fontFamily, // built-in font family
            dy: font.correction(size, lineHeight),
            fontColor,
          })
        );
        return () =>
          page.drawPage(textPage, {
            width,
            height,
            x,
            y: pageHeight - y - height,
          });
      } else if (object.type === "drawing") {
        let { x, y, path, scale } = object;
        const {
          pushGraphicsState,
          setLineCap,
          popGraphicsState,
          setLineJoin,
          LineCapStyle,
          LineJoinStyle,
        } = PDFLib;
        return () => {
          page.pushOperators(
            pushGraphicsState(),
            setLineCap(LineCapStyle.Round),
            setLineJoin(LineJoinStyle.Round)
          );
          page.drawSvgPath(path, {
            borderWidth: 5,
            scale,
            x,
            y: pageHeight - y,
          });
          page.pushOperators(popGraphicsState());
        };
      }
    });
    // embed objects in order
    const drawProcesses = (await Promise.all(embedProcesses)).filter(Boolean);// filter out noop/undefined functions
    if (drawProcesses.length > 0) {
      drawProcesses.forEach((p) => p());
    }
  });
  await Promise.all(pagesProcesses);
  try {
    return await pdfDoc.save();
    // Convert Uint8Array to Blob
    //const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    // if (is_signing) {
    //   var data = new FormData();
    //   data.append("pdf", pdfBlob, name);
    //   data.append("is_processed_pdf", true);
    //   data.append("entityName", entityName);
    //   data.append("entityId", entityId);
    //   data.append("contractId", contractId);
    //   await fetch(`${config.API_HOST}/contract/save-pdf`, {
    //     method: "POST",
    //     body: data,
    //   });
    // } else {
    //   download(pdfBytes, name, "application/pdf");
    //   // window.close()
    // }
  } catch (e) {
    console.log("Failed to process PDF.");
    throw e;
  }
}
