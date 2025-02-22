importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.2.0/workbox-sw.js');

workbox.precaching.precacheAndRoute([{"revision":"ccd6e4d27b25840031cc59c371a5f52d","url":"dist/app.js"},{"revision":"c3bf00e585782373e1b601c07b513d85","url":"dist/fonts/Quicksand_Bold.otf"},{"revision":"891d5740c1af1fad4da3afee1289c11c","url":"dist/images/cropped-bird_red-2.webp"},{"revision":"38e43cd7b492b624fc3da67dea7b0433","url":"dist/images/loadingImg.gif"},{"revision":"d6223ad2dfebbfe22e932087e0ec74f0","url":"dist/images/red_bird_256.webp"},{"revision":"f6a86e8018fc1f6ae254b339acbd1cdd","url":"dist/splide4.min.css"},{"revision":"06616cc30586778e4f22a50f2f22c30b","url":"dist/splide4.min.js"},{"revision":"b25174ff59e2567ec1c6532d5f785654","url":"dist/styles/app.css"},{"revision":"822fb69bb82f653a04c66370505a2d77","url":"index.html"},{"revision":"f3c6bfd852491a14a1828369a8a8eca2","url":"manifest.json"}], {
  ignoreURLParametersMatching: [/^book/, /^cr_user_id/],
  exclude: [/^lang\//],
});

const channel = new BroadcastChannel("cr-message-channel");
let version = 1.2;
let cachingProgress = 0;
let cachableAssetsCount = 0;

channel.addEventListener("message", async function (event) {
  if (event.data.command === "Cache") {
    console.log("Caching request received in the service worker with data: ");
    console.log(event.data);
    cachingProgress = 0;
    cacheTheBookJSONAndImages(event.data.data);
  }
});

// Precache static assets during service worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});


self.addEventListener("activate", function (event) {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
  channel.postMessage({ command: "Activated", data: {} });
  return self.clients.claim();
});

self.registration.addEventListener("updatefound", function (e) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      if (cacheName == workbox.core.cacheNames.precache) {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ msg: "UpdateFound" })
          );
        });
      }
    });
  });
});

// Serve cached assets when offline or falling back to the network
self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);
  if (requestURL.protocol === 'chrome-extension:') {
    return;
  }
  // console.log("Fetching the request: ", event.request.url);
  // event.respondWith(
  //   caches.match(event.request, {ignoreVary:true}).then(function (response) {
  //     if (response) {
  //       return response;
  //     } 
  //     return fetch(event.request);
  //   })
  // );
  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((response) => {
          // If the asset is in the static cache, return it
          if (response) {
            return response;
          }

          // If not in the static cache, fetch it from the network
          return fetch(event.request).then((networkResponse) => {
          // Cache a copy of the response in the static cache for future use

          return networkResponse;
        });
      })
    );
  } else {
    // For requests to the BookContent folder, use the Book Content cache
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

function cacheTheBookJSONAndImages(data) {
  console.log("Caching the book JSON and images");
  let bookData = data["bookData"];
  let bookAudioAndImageFiles = [];
  
  for (let i = 0; i < bookData["pages"].length; i++) {
    let page = bookData["pages"][i];
    for (let j = 0; j < page["visualElements"].length; j++) {
      let visualElement = page["visualElements"][j];
      if (visualElement["type"] === "audio") {
        bookAudioAndImageFiles.push(`/BookContent/${data["bookData"]["bookName"]}/content/` + visualElement["audioSrc"]);
        for (let k = 0; k < visualElement["audioTimestamps"]["timestamps"].length; k++) {
          bookAudioAndImageFiles.push(`/BookContent/${data["bookData"]["bookName"]}/content/` + visualElement["audioTimestamps"]["timestamps"][k]["audioSrc"]);
        }
      } else if (visualElement["type"] === "image" && visualElement["imageSource"] !== "empty_glow_image") {
        bookAudioAndImageFiles.push(`/BookContent/${data["bookData"]["bookName"]}/content/` + visualElement["imageSource"]);
      }
    }
  }

  cachableAssetsCount = bookAudioAndImageFiles.length;

  bookAudioAndImageFiles.push(data["contentFile"]);

  console.log("Book audio files: ", bookAudioAndImageFiles);

  caches.open(bookData["bookName"]).then((cache) => {
    for (let i = 0; i < bookAudioAndImageFiles.length; i++) {
      cache.add(bookAudioAndImageFiles[i]).finally(() => {
        updateCachingProgress(bookData["bookName"]);
      }).catch((error) => {
        console.log("Error while caching the book JSON", error);
      });
    }
    cache.addAll(bookAudioAndImageFiles).catch((error) => {
      console.log("Error while caching the book JSON", error);
    });
  });

}

function updateCachingProgress(bookName) {
  cachingProgress++;
  let progress = Math.round((cachingProgress / cachableAssetsCount) * 100);
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) =>
      client.postMessage({
        msg: "Loading",
        data: {progress, bookName},
      })
    );
  });
}