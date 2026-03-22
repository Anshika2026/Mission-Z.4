const BASE_URL =
  "https://script.google.com/macros/s/AKfycbyownwE2EPj2jdOQh-r8e_OsEv1fPxLQcwYywIA9aDUBWx2ks9iIljXjs4A6hN9Wsx0/exec";

// async function api(action, data = {}) {
//   const formData = new FormData();
//   formData.append("action", action);

//   Object.keys(data).forEach((key) => {
//     formData.append(key, data[key]);
//   });

//   const res = await fetch(BASE_URL, {
//     method: "POST",
//     body: formData,
//   });

//   return res.json();
// }
// async function api(action, data = {}) {
//   const params = new URLSearchParams({ action, ...data });

//   const res = await fetch(`${BASE_URL}?${params.toString()}`);
//   return res.json();
// }

async function api(action, data = {}) {
  const params = new URLSearchParams({ action, ...data });

  const res = await fetch(`${BASE_URL}?${params}`, {
    method: "GET",
    credentials: "omit",
  });

  return res.json();
}

// async function api(action, data = {}) {
//   const formData = new FormData();
//   formData.append("action", action);

//   Object.keys(data).forEach((key) => {
//     formData.append(key, data[key]);
//   });

//   try {
//     await fetch(BASE_URL, {
//       method: "POST",
//       body: formData,
//       mode: "no-cors",
//     });

//     return await fetch(BASE_URL, {
//       method: "POST",
//       body: formData,
//     }).then((res) => res.json());
//   } catch (err) {
//     console.error("API ERROR:", err);
//     return { error: true };
//   }
// }

// async function api(action, data = {}, retries = 2) {
//   const params = new URLSearchParams({ action, ...data });

//   try {
//     const res = await fetch(`${BASE_URL}?${params}`, {
//       method: "GET",
//     });

//     if (!res.ok) throw new Error("Network error");

//     return await res.json();
//   } catch (err) {
//     if (retries > 0) {
//       return api(action, data, retries - 1);
//     }

//     console.error("API FAILED:", err);

//     return {
//       error: true,
//       message: "Server not responding",
//     };
//   }
// }

// function api(action, data = {}) {
//   return new Promise((resolve, reject) => {
//     const callbackName = "cb_" + Date.now();

//     window[callbackName] = (response) => {
//       resolve(response);
//       delete window[callbackName];
//       script.remove();
//     };

//     const params = new URLSearchParams({
//       action,
//       ...data,
//       callback: callbackName,
//     });

//     const script = document.createElement("script");
//     script.src = `${BASE_URL}?${params}`;
//     script.onerror = reject;

//     document.body.appendChild(script);
//   });
// }
