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
      return "7LZmas_w-EE_ciiFfEtKrkIuOH21A-MX-z6swc5OzX3mJLBjwfBewfj4k46SOhF0oUqAjiaxOaOE0Pwd5jVFWcwZaDEEjJdC9gcennKsRxAB5Xle2FWgrZX4kPfjG1mpLJXwREZx_hWJKagMIJjSY7PL5mcZ3WMDJajUJEGWpdB52zb66vF151YB0S2VsvN7kDF8QCQ7vA5QCeLmznXV2P5lGeHgnRvLGqeWAGKNZOXxvITEdwckdjWb-9HnYQOUOvGXnVWj9sf9G3E5-3EzXaW-JTTvbgFZlshxoeesHw7EUVfH4E7oIFlMhMwlFE1zSLOBYn_duEYTkzFrvckzULy6RPdQ8RChtICH1e2qdfjQL8VFtqvc6LD20_3rAyCm4Yw880_yUCS3ytpSJKMFDweW8MGu8U0i6z5CnWZ40peBDM9dRadQ8DY-Koglw8rUCila_cUzMp24hP4eye1o4MMSxrXgy_LQBucUAmz2QOWJwXO_N8MOPVhsGZT-mHNDwJHOnjYU0jHsGQyOMu_lDyfVS_Gkr6YMZkB1zFA6bOP2ZakXGTLXMUMTKoUDJSjD";
    }
    return "";
  }
}
