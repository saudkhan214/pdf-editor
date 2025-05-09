const scripts = [
  {
    name: "pdfjsLib",
    src: "https://unpkg.com/pdfjs-dist@2.3.200/build/pdf.min.js",
  },
  {
    name: "PDFLib",
    src: "https://unpkg.com/pdf-lib@1.4.0/dist/pdf-lib.min.js",
  },
  {
    name: "download",
    src: "https://unpkg.com/downloadjs@1.4.7",
  },
  { name: "makeTextPDF", src: `${process.env.BASE_PATH}makeTextPDF.js` },
];

const assets = {};
export function getAsset(name) {
  if (assets[name]) return assets[name];
  const script = scripts.find((s) => s.name === name);
  if (!script) throw new Error(`Script ${name} not exists.`);
  return prepareAsset(script);
}

export function prepareAsset({ name, src }) {
  if (assets[name]) return assets[name];
  assets[name] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(window[name]);
      console.log(`${name} is loaded.`);
    };
    script.onerror = () => {
      reject(`The script ${name} didn't load correctly.`);
      alert(
        `Some scripts did not load correctly. Please reload and try again.`
      );
    };
    document.body.appendChild(script);
  });
  return assets[name];
}

export default function prepareAssets() {
  scripts.forEach(prepareAsset);
}

// out of the box fonts
const fonts = {
  Courier: {
    correction(size, lineHeight) {
      return (size * lineHeight - size) / 2 + size / 6;
    },
  },
  Helvetica: {
    correction(size, lineHeight) {
      return (size * lineHeight - size) / 2 + size / 10;
    },
  },
  "Times-Roman": {
    correction(size, lineHeight) {
      return (size * lineHeight - size) / 2 + size / 7;
    },
  },
};
// Available fonts
export const Fonts = {
  ...fonts,
  // Arial: {
  //   src: "./arial.ttf",
  //   correction(size, lineHeight) {
  //     return (size * lineHeight - size) / 2 + size / 8;
  //   },
  // },
  // Georgia: {
  //   src:"./georgia.ttf",
  //   correction(size, lineHeight) {
  //     return (size * lineHeight - size) / 2 + size / 9;
  //   },
  // },
  // Verdana: {
  //   src:"./Verdana.ttf",
  //   correction(size, lineHeight) {
  //     return (size * lineHeight - size) / 2 + size / 12;
  //   },
  // }
};

export async function fetchFont(name) {
  if (fonts[name]) return fonts[name];
  const font = Fonts[name];
  if (!font) throw new Error(`Font '${name}' not exists.`);
  
  try {
    const response = await fetch(font.src);
    const fontBuffer = await response.arrayBuffer();
    
    if (fontBuffer.byteLength === 0) {
      throw new Error('Font source not found');
    }
    
    const fontFace = new FontFace(name, fontBuffer);
    fontFace.display = "swap";
    await fontFace.load();
    document.fonts.add(fontFace);
    
    fonts[name] = {
      ...font,
      buffer: fontBuffer,
    };
    
    return fonts[name];
  } catch (error) {
    throw error;
  }
}

