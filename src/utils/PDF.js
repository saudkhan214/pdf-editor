import { readAsArrayBuffer } from "./asyncReader.js";
import { fetchFont, getAsset } from "./prepareAssets";
import { noop } from "./helper.js";
import { config } from "./config.js";
import fontkit from '@pdf-lib/fontkit';
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
export async function copy(contract) {
  var data = new FormData();
  data.append("resourceId", contract.esignTemplateId);
  data.append("module", contract.module);
  try {
    var res = await fetch(`${config.API_HOST}/contract/copy-pdf`, {
      method: "POST",
      body: data,
    });
    const json = await res.json();
    if (res.status != 200) {
      console.log(json);
      return { error: json.error, success: false };
    }
    return { msg: `Pdf copied with resource Id :${json.resource_id}`, success: true };
  } catch (ex) {
    console.log(ex);
    return { error: ex.message, success: false };
  }
}
export function downloadPdf(pdfBytes, name) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  download(blob, name, "application/pdf");
}
export async function processPdf(
  pdfFile,
  objects
) {
  const PDFLib = await getAsset("PDFLib");
  // const download = await getAsset("download");
  // const makeTextPDF = await getAsset("makeTextPDF");

  let pdfDoc;
  try {
    pdfDoc = await PDFLib.PDFDocument.load(await readAsArrayBuffer(pdfFile));
  } catch (e) {
    console.log("Failed to load PDF.");
    throw e;
  }

  pdfDoc.registerFontkit(fontkit);
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
        };
      }else if (object.type === "text") {
  let { x, y, text, lines, lineHeight, size, fontFamily, charLimit, fontColor = '#000000', dir = 'ltr' } = object;
  let limit = parseInt(charLimit) || 80;
  const fontData = await fetchFont(fontFamily);
  const customFont = await pdfDoc.embedFont(fontData.buffer, { subset: false });
  const colorRgb = PDFLib.rgb(
    parseInt(fontColor.slice(1, 3), 16) / 255,
    parseInt(fontColor.slice(3, 5), 16) / 255,
    parseInt(fontColor.slice(5, 7), 16) / 255
  );
 
  let finalLines = [];
  let contentValue = text || (Array.isArray(lines) ? lines.join(" ") : (lines || ""));
  let content = (typeof contentValue === 'object' && contentValue !== null) ? "" : String(contentValue || "");
  content = content.replace(/\s+/g, ' ').trim();
if (dir === 'rtl') {
    const fkFont = fontkit.create(fontData.buffer);
    const layout = fkFont.layout(content);
    let shaped = layout.glyphs.map(g => String.fromCodePoint(...g.codePoints)).join('');
    let fullReverse = shaped.split('').reverse().join('');
    content = fullReverse.replace(/[0-9a-zA-Z%$./:-@_-]+([\s,]+[0-9a-zA-Z%$./:-@_-]+)*/g, (m) => {
      return m.split('').reverse().join('');
    });
  }

  const words = content.split(' ');
  let currentLine = "";
  words.forEach(word => {
    const testLine = currentLine === "" ? word : currentLine + " " + word;
    if (testLine.length <= limit) {
      currentLine = testLine;
    } else {
      if (currentLine !== "") finalLines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine !== "") finalLines.push(currentLine);
 
  return () => {
    finalLines.forEach((line, index) => {
      const textWidth = customFont.widthOfTextAtSize(line, size);
      const yPos = pageHeight - y - (size * 0.9) - (size * index * lineHeight);
      
      let drawX = x;
      if (dir === 'rtl') {
        const boxWidth = limit * (size * 0.6); 
        drawX = x + boxWidth - textWidth;
      }

      page.drawText(line, {
        x: drawX,
        y: yPos, 
        size: size,
        font: customFont,
        color: colorRgb,
      });
    });
  };
  // const height = size * lineHeight * (lines ? lines.length : 1);
        // const font = await fetchFont(fontFamily);

        // const processedLines = lines.map(processLine);
        // const maxWidth = processedLines.reduce((max, { text }) => {
        //   return Math.max(max, getTextWidth([text], 0));
        // }, 0);

        // width = Math.max(maxWidth + 5, width || 0);
        // const [textPage] = await pdfDoc.embedPdf(
        //   await makeTextPDF({
        //     lines: processedLines.map(l => l.text),
        //     fontSize: size,
        //     lineHeight,
        //     width,
        //     height,
        //     font: font.buffer || fontFamily, // built-in font family
        //     dy: font.correction(size, lineHeight),
        //     fontColor,
        //   })
        // );
        // return () =>
        //   page.drawPage(textPage, {
        //     width,
        //     height,
        //     x,
        //     y: pageHeight - y - height,
        //   });
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
  } catch (e) {
    console.log("Failed to process PDF.");
    throw e;
  }
}
