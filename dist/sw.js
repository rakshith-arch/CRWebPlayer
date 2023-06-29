importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

workbox.precaching.precacheAndRoute([{"revision":"2ff73d913c754f97fc3fbb226c91806c","url":"app.js"},{"revision":"c3bf00e585782373e1b601c07b513d85","url":"fonts/Quicksand_Bold.otf"},{"revision":"891d5740c1af1fad4da3afee1289c11c","url":"images/cropped-bird_red-2.webp"},{"revision":"d6223ad2dfebbfe22e932087e0ec74f0","url":"images/red_bird_256.webp"},{"revision":"d17cebaabed6bdbc2f0c9e001c6cf97a","url":"index.html"},{"revision":"793b60649c0822b614f9f0867a39e9dc","url":"manifest.json"},{"revision":"0410a17ac741909d52fa79d79f216978","url":"Models/AudioElement.js"},{"revision":"8d8313a73bc34ac13f66cadf69b3f1f5","url":"Models/AudioTimestamps.js"},{"revision":"b616fda9c6c45e6b2d02aee914f77da0","url":"Models/Book.js"},{"revision":"48e0e0b98880b0903733aad1679caca6","url":"Models/ImageElement.js"},{"revision":"1183ee323859e12a4331eee0b0d8b019","url":"Models/Models.js"},{"revision":"8a2104f9d00c2611945b1964922a97cd","url":"Models/Page.js"},{"revision":"a18548e2ac9ec46eb3832f8593be1dd7","url":"Models/TextElement.js"},{"revision":"9e1343cfaedee3985dd156e7dddb651e","url":"Models/WordTimestampElement.js"},{"revision":"c36ba7ed57b5f23d92855c5c954ee3a3","url":"Parser/ContentParser.js"},{"revision":"96ec74d8aa49c21833091d41bf7ce195","url":"PlayBackEngine/PlayBackEngine.js"},{"revision":"3898363e28ac803232de451798ccd214","url":"styles/app.css"}], {});

const channel = new BroadcastChannel("cr-message-channel");

let version = 0.9;
let cachingProgress = 0;

self.addEventListener("install", async function (e) {
  self.addEventListener("message", async (event) => {
    console.log("Registration message received in the service worker ");
    if (event.data.type === "Registration") {
      if (!!!caches.keys().length) {
        cachingProgress = 0;
        let cacheName = await getCacheName(event.data.value);
      }
    }
  });
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
});

channel.addEventListener("message", async function (event) {
  console.log("Caching request received in the service worker with data: ");
  console.log(event.data);
  if (event.data.command === "Cache") {
    cachingProgress = 0;
    await cacheTheBookJSONAndImages(event.data.data);
  }
});

async function cacheTheBookJSONAndImages(data) {
  console.log("Caching the book JSON and images");
  let bookData = data["bookData"];
  let bookAudioAndImageFiles = [];
  
  for (let i = 0; i < bookData["pages"].length; i++) {
    let page = bookData["pages"][i];
    for (let j = 0; j < page["visualElements"].length; j++) {
      let visualElement = page["visualElements"][j];
      if (visualElement["type"] === "audio") {
        bookAudioAndImageFiles.push("/BookContent/LetsFlyLevel2En/content/" + visualElement["audioSrc"]);
        for (let k = 0; k < visualElement["audioTimestamps"]["timestamps"].length; k++) {
          bookAudioAndImageFiles.push("/BookContent/LetsFlyLevel2En/content/" + visualElement["audioTimestamps"]["timestamps"][k]["audioSrc"]);
        }
      } else if (visualElement["type"] === "image" && visualElement["imageSource"] !== "empty_glow_image") {
        bookAudioAndImageFiles.push("/BookContent/LetsFlyLevel2En/content/" + visualElement["imageSource"]);
      }
    }
  }

  bookAudioAndImageFiles.push(data["contentFile"]);

  console.log("Book audio files: ", bookAudioAndImageFiles);

  await caches.open(bookData["bookName"]).then(async (cache) => {
    await cache.addAll(bookAudioAndImageFiles).catch((error) => {
      console.log("Error while caching the book JSON", error);
    });
    console.log('Cache done');
  });
  await self.clients.matchAll().then((clients) => {
      clients.forEach((client) =>
          client.postMessage({
              msg: "Loading",
              data: 100,
          })
      );
  });
}

self.addEventListener("fetch", function (event) {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.protocol === 'chrome-extension:') {
    return;
  }
  event.respondWith(
      caches.match(event.request).then(function (response) {
          if (response) {
            return response;
          }
          return fetch(event.request);
      })
  );
});