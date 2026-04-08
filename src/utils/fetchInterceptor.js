import { config } from "./config";
const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  if (url.startsWith(config.API_HOST)) {
    const customHeaders = {
      Authorization: `Bearer ${getAccessToken()}`,
    };

    options.headers = {
      ...options.headers,
      ...customHeaders,
    };
  }

  try {
    const response = await originalFetch(url, options);
    return response;
  } catch (error) {
    console.error("Fetch intercepted error:", error);
    throw error;
  }
};

function getAccessToken() {
  try {
    var key = opener.parent.application.context.get_apiTokenKey();
    return opener.parent.$.jStorage.get(key);
  } catch (ex) {
    if (config.API_HOST.indexOf("localhost") > -1) {
      return "OXNWPensmporwJhrMSA5EiAyd0ygam9-4Atvm-6fluSIvRvAgkSoL-oqN2KeU0C-Hwmf0uCO9CDo9PByGIdGejMC9CMqJe-ew-hPLZFS1wtFuTHdIASxpaboas6YGCk_k8i7US3QaUtzkIsLiv_XjsRYn3ZXrFJEXOKZig0ScpcH4HSMm3IBbdo2eMC43TlDzWbRbkSkx1T6dxwHUBq4exR1mRWkgPe653drxCg76azDUVF8-a03_wye0wUifTFpQc1NTrmUH7VlnwdB2Wj69P1bZviu1dGte-ylyL3iukHTru1fXE4G5ZROyfYGJuhfJVhSehdDe9unBfXIrvxAXncraUiJQnTFNssUFQPI1XZESFJUP7T2qLfRcfALmVeO6AzfkIYdh_ErUQX5RYIgC08Y5Gd9WHHgTClt2OKM0Q-oEM91whpU18sn98CyhiRyaMJmG-Jv91SRNvBMgA5d-NDTyS_k4LHQtE6tSCMx7Lyh82Lf3rD2iipBOPvpRFwryaCqwVFSFRFDDGZxatRlj_6tmA_40mK0arVBrhNLYbe7dAI_tsLxTp5caemYRQPA";
    }
    return "";
  }
}
