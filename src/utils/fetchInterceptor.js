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
      return "vAOVwJLFRoKFxPG1-hqoQabg-ngBOq59JE5cIcuOPyTfefvPRsS6pvf5z1Q_kBpiSMT56X4Id-f4OgwQUUDMkFJ4RTvQgwVTWy4s2FpPWfSaCmrqo9NzcAl-uARWfDZHVc51TKf8IPMGjnMYAQZnFiTE5Udpg_jXF6-RihxIQcVkBvPmb_RG9s18AuuvBzOOE6Nd6jQDSdPkQpJuXNNGTi5FWZWz4OjTzj8fU9BiT5PXO0TwehiI_PnGIW9S9ekhu3-TnKhcTIYGxZrLrbNzLU0uRWssONfFIai_UFRbQkePFSbYVXbzicl4epK_LwuiVhVJYHfBvQodPFP5JPblsq8dTMuc72ky7PP9NFTeCvJ1kqD0SSaODUjwqOfz1dZxgg1SHzdBdDO6KtnhMCMjkunaCktTtJiRkm6IRR57iCJ9pxd-SIOhAXsE-MpgwNQj1j0uqNx2tvWH_ebVODZeBUjg0MginrdoMKYj-yDly1gezKKZxGdne81u-KMGXBRn3McXh9WYnKMAyPOiL3Yi_iU9T8ddR7JxsDxWQYvT4v7i3Nr1yoXPiH1oVJmOSukTAkLMvBfja2b_yuIeDtrsxw";
    }
    return "";
  }
}
