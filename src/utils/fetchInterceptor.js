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
      return "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0QzE5RjY2QjY3RjE4M0U1N0QxQzA5RkI2RjYwN0U3QzE1MjcifQ.eyJleHBpcmVkX3N0YWdlIjpmYWxzZSwiaWF0IjoxNjg4NTk2NzA5LCJqdGkiOiIxYjM4ZDYyMC1mZWIxLTQ5OTAtODc5Mi1lYzA2ZTIyZjYwMDgiLCJzdWIiOiIxMjM0NTY3ODkwIiwic3ViX3Rva2VuX2lkIjoiMTIzNDU2Nzg5MCIsInVzZXJfaWQiOiIxMjM0NTY3ODkwIiwidXNlcl9uYW1lIjoiam9obmRvZSIsInVzZXJfdHlwZSI6ImFkbWluIn0.eyJleHBpcmVkX3N0YWdlIjpmYWxzZSwiaWF0IjoxNjg4NTk2NzA5LCJqdGkiOiIxYjM4ZDYyMC1mZWIxLTQ5OTAtODc5Mi1lYzA2ZTIyZjYwMDgiLCJzdWIiOiIxMjM0NTY3ODkwIiwic3ViX3Rva2VuX2lkIjoiMTIzNDU2Nzg5MCIsInVzZXJfaWQiOiIxMjM0NTY3ODkwIiwidXNlcl9uYW1lIjoiam9obmRvZSIsInVzZXJfdHlwZSI6ImFkbWluIn0";
    }
    return "";
  }
}
