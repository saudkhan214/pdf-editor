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
      return "dn6hzuWGBoPfFZRGutbG5Od21R11-DdCTNOBR-kde8Stv42_tsTD-jToTy5ASJihfo1_LID5xeEeotoLkMUjnOs5srzssNj2C-63Mmfto3rDWae95qTIkN9WMhxnmbLGc8kBSchwE3fTFWXNDR1z22PhMpDcDmiFkzkQ4MixDnWiKhwSTTFknb8d5hOeTvEpEBujn-BUpoVWTMuhqFzmbrAx4E9qGkC7_Yd3z38neS9Ly3FQi1-Ofzg7Zvs1ToQDLF3PMb0ZG_xGlVxRBGiC3CS3Mqmd--KcZoLJHSHr1DfjQ7jcj3nygVUxZDMFiT5F5oHwVpQ-RO_L63ukTLl6Q4PK1cWczhmsW2LmLwhmgtBGC-OYNfQx6fDt82Ry228nPWmQse2xXqy6skt3yInSVmCAg36Nmo6dGr7OI0_wPBktzZkaqSyojdeJR9PL1d7agKLyjDUVKt2hQDjp08JsX3dedCbqpbgDq_NTnvWAaL4Zti0eBcoobDkQUOA9grtI-DrTf0xv9cJ3OUOZ-lwYd_QIQi1PrbQafX7yfLSIs08NUml0XSAmgP02vj3Tcksm";
    }
    return "";
  }
}
