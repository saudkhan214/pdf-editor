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
      return "PafYk5I9457IPJg0bY6_sXe0yzBTmaxuFHs6JxpCQIWUGDXdocvbno6QNnu3EgLiexaUnThqTtIsy31L-EzuvJD2mFGmJHB9UocK17uzvDs8Hf3KkawT8t8AoRI6Aw7-QZdEYT8RiRZtKxARdxybMoncGM4EB51MidRluNQdODqYOacN3HyjijNQ84v4O2mKWkBEvKFS_jS_9hjJ_Mi7OoQt1ABbLFNYAlyRtdWVAGb3wNnPPuv696Jyk3EGZ7j1_BXnXHuEkSp9K3NXZlryC8Hn2-W39yBuOlca5En5VP4E74uHjIduo4iVy4PhzvQHvXtAGUh8j5ebv_NfiJTF62pAMuV-95aTBQz4mZgUwhIMMtOa5eL19S18FqVHHMgOCDWGPb3GoGiLYmBfaB1ioeyJLf8uOVizP8GgKdyd3ksD4XJTx4nnTvVpjEvurDnYup6cb5ueYGyxJoyb_Ve3qtifT0xk3LebFqsbTyrThCaDh3iInRalLtsNKG-6Wth9ORzdpPb222qi4R6vQJ3mj2Y-LVL_H7KveZXJehGKEY-s4k6L9ooiy7iI6Rp7HBTL";
    }
    return "";
  }
}
