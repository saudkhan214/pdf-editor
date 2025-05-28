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
      return "UK68QwHkZJU-pXf_DYGAu0getYZWgj9aFiYl1gnUoCMCdj1LGUzxFz5ZeHXedKEPqCPlW4kofxCRdre6zWuzX7qvWIhs9pOxGPz4_qN2aQ81yfrTFffBeONXaagIO3l8H4Z-MfdW8S8o9OhW9tbf8tLZYy0UHI1GLL0UkAyEzRhnR_K57KSij-0gN-A4iu270ClMTQE8L230IBYWAfTMP0XRlsyFHv-Jrg2OU1ewVYRsa9AFCrBl0M6BJLs9DQnWSO8QFPugmf4nSxH-9W0_H5ibNMkNPh-gXuExEiOEKjsQpGU1XjixzKz40WgesTk1oDYWKhSSUgEaoHnG0HSLmelXJPwtgVSvc4CHnedANLf0fV5cOj0TDTTk2Dm1ld9RXlIlKgK7N2i9mnrtf1jyUt-C3JLcEl_0gM3hXHdorUAeqfwh3yln0gudzxA1uL-9gUFaS_LmMxQ7TLlBOBDoCBOumRxkv7V537r4KVBGl0AC_y54SPafwH-zAXCpPuidaB9Fx7LB1h4-VNyBgMJIjwSfRP9pXVuNBViMW8j2csBSfxdQQONOtjQOPzjRuXl1";
    }
    return "";
  }
}
