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
      return "PKLO-9nLDkAOPB7xGPxbBXbeMcnv5ta1BhwOxGyWUkJeUrsdTGBKcXPg957CqusZw_pw2_0FaSAXuDARdrZMOyQcu4kSS6c1thi6w755Js3L7_5Bm3hRTSEpLjxE40Pm5ZgHg9-YlqwiMeErQC-utv8qRPzFj-ThEMtaXEHyxeFvfz1PsGD2Zp5H-zg9kcsKGp-N2Fn3G4qd9yulIF1QVMFrTaDRNObPZ07XJZmN4Tg2wlaSHNCucx4aUuldzGZP0E0uaUx0uqZS-56iKKWz_s65ChEIj-9opU7bzcv1DR8x5NM75mcLiaSLBH4MZj55BFAy5xqzmDwqIwIA3cR149ude1hGrKNewqZGF5RxL3XUVwGDNDB2cjA04_rKd6bdNUdPgZDvVjfN0mS9AP4pzzQm3oQ5RpVcxoHBKoE-5v6ydbv3Kjl6jPzFk9Uqg_mAu3teSurLTPnrU9h7oaG_E1dZLvOQEPRFOYJFbNb49MyKyb5DfHVU01C1fhaE8A-R0ewD2FX6oaZQux3zyAfd3MKzrGBIBLG68QKhpaDjsr0M5Vr32uOl4vBtmk46vQnk";
    }
    return "";
  }
}
