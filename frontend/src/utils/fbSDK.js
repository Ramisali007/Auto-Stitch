/**
 * Initialize Facebook SDK
 */
export const initFacebookSDK = () => {
  return new Promise((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID, // You need to add this to .env
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      resolve();
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  });
};

/**
 * Trigger Facebook Login Dialog
 */
export const loginWithFacebook = () => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not loaded'));
      return;
    }
    window.FB.login((response) => {
      if (response.authResponse) {
        resolve(response.authResponse.accessToken);
      } else {
        reject(new Error('User cancelled login or did not fully authorize.'));
      }
    }, { scope: 'public_profile,email' });
  });
};
