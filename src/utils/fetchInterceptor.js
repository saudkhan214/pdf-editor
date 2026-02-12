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
      return "Stybui5UBMlmgXprf7cnELiGLHhM5j63jhlt_RWOqsrUOf1C-ssIw_3KqfwZPXRLgrLjiCxap2rgC8gg-QMZq0u39TQchPL1JGjtteZHYzEnAvuSxXbdcsWk1rWzwbA8tG5DcPMlT8UitP3rdQRrTDfNg_kVlYZNZPgm_6VwJ7e-osahmPl0g_0gHhXccHtnWG98skESTL1tW9V1M1kxMHzlHJZ8ERRr4txNBYNn0io3oEFuCC3sgXL8hrmt0sDpeykZ1wf-VW1PSHttM9Gnmi0L9YkajOd6Mo2yVmOPI2nmYQsPs_-SlwKGB7EkW-uj5WEcwBEYvslFq3Yv9yvIE8a2onGVik2TVFSdka3c2n_TR8oogP1V1UQonqOHCxwA5pAb1Eea9MiXM0_re9zsNg-4Fik9GAdhpSvEvgu7uS-Yjl6nW75h87SCwaMr7pPVA8nYe1o88di_L7UyKWdCV2EmEessmoFg4fGAAuVlgnBOocM-9Eivejp7bhqFb7X24T2VVPR2O_uQZP7Z149OTs8WK08rT6V62Kg_B-GexBdVVEtO6vbdIojcyqJMN_fK";
    }
    return "";
  }
}
