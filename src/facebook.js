const FB_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
const GRAPH_VERSION = "v25.0";

let sdkReady = null;

export function initFacebookSdk(appId) {
  if (!appId) {
    return Promise.reject(new Error("Facebook App ID is not configured."));
  }

  if (window.FB && sdkReady) {
    return sdkReady;
  }

  sdkReady = new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: GRAPH_VERSION,
      });
      resolve(window.FB);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: GRAPH_VERSION,
      });
      resolve(window.FB);
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = FB_SDK_URL;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Failed to load Facebook SDK."));
      document.body.appendChild(script);
    }
  });

  return sdkReady;
}

export function loginWithFacebook() {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK is not initialized."));
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
          return;
        }

        reject(new Error("Facebook login was cancelled or not authorized."));
      },
      {
        scope: "pages_show_list,pages_read_engagement,pages_manage_posts",
      }
    );
  });
}

export async function getFacebookPages(accessToken) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Failed to fetch Facebook pages.");
  }

  return data.data || [];
}
