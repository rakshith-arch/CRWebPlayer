// Main Entry for the Curious Reader Web Player App
import { ContentParser } from "./Parser/ContentParser";
import { PlayBackEngine } from "./PlayBackEngine/PlayBackEngine";
import { Workbox } from "workbox-window";
// import { CRServiceWorker } from "./Helpers/ServiceWorker/ServiceWorker";
import { Book } from "./Models/Models";
import { Splide } from "@splidejs/splide";

 export class App {

    contentParser: ContentParser;
    playBackEngine: PlayBackEngine;
    // serviceWorker: CRServiceWorker;
    
    contentFilePath: string;
    imagesPath: string;
    audioPath: string;

    broadcastChannel: BroadcastChannel;

    cachedLanguages: Map<string, string> | null = new Map<string, string>();
    // cachedLanguagesTag: string = "cached_languages";
    lang: string = "english";
    isCached: string = "is_cached";

    constructor(contentFilePath: string, imagesPath: string, audioPath: string) {
        this.contentFilePath = contentFilePath;
        this.imagesPath = imagesPath;
        this.audioPath = audioPath;
        this.contentParser = new ContentParser(contentFilePath);
        this.playBackEngine = new PlayBackEngine(imagesPath, audioPath);
        this.broadcastChannel = new BroadcastChannel("my-channel");
        // this.serviceWorker = new CRServiceWorker();
        // this.serviceWorker.InitializeAndRegister();

        if (localStorage.getItem(this.isCached) == null) {
            this.cachedLanguages = new Map();
        } else {
            let cachedLanguageString: string | null = localStorage.getItem(this.isCached)!;
            this.cachedLanguages = new Map(JSON.parse(cachedLanguageString));
        }
    }

    async initialize() {
        let book: Book = await this.contentParser.parseBook();

        console.log("Dev App initialized!");
        console.log(book);

        this.enforceLandscapeMode();
        
        window.addEventListener("load", async () => {
            if ("serviceWorker" in navigator) {
                let wb = new Workbox("./sw.js", {});
                wb.register().then((serviceWorkerRegistration) => {
                    if (serviceWorkerRegistration!.installing) {
                        serviceWorkerRegistration!.installing.postMessage({
                        type: "Registration",
                        value: this.lang,
                        });
                    }
                });

                if (!this.cachedLanguages!.has(this.lang)) {
                    this.broadcastChannel.postMessage({ command: "Cache", data: this.lang });
                }
                
                navigator.serviceWorker.addEventListener("message", (event) => {
                    if (event.data.msg == "Loading") {
                        if (event.data.data == 100) {
                            this.cachedLanguages?.set(this.lang, "true");
                            localStorage.setItem(
                                this.isCached,
                                JSON.stringify(this.cachedLanguages?.entries())
                            );
                            this.readLanguageDataFromCacheAndNotifyAndroidApp();
                        }
                    }
                });
            }
            
        });

        this.playBackEngine.initializeBook(book);
    }

    readLanguageDataFromCacheAndNotifyAndroidApp() {
        //@ts-ignore
        if (window.Android) {
            //@ts-ignore
            window.Android.cachedStatus(cachedLanguages.has(lang) ? cachedLanguages.get(lang) : null);
        }
    }

    enforceLandscapeMode() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape")
            .then(() => {
                console.log("Screen orientation locked to landscape!");
            })
            .catch((error) => {
                console.error("Failed to lock screen orientation: ", error);
            });
        } else {
            console.warn("Screen orientation lock not supported! Interface may not work as expected on mobile devices!");
        }
    }

 }

 // Passing absolute path to the content file and resource directories
 // Curious Reader Book: Let's Fly Level 2
// let app: App = new App("/BookContent/LetsFlyLevel2En/content/content.json",
//     "/BookContent/LetsFlyLevel2En/content/images/",
//     "/BookContent/LetsFlyLevel2En/content/audio/");

// GDL Book: Talking Bag English
let app: App = new App("/BookContent/TalkingBagEn/content/content.json",
    "/BookContent/TalkingBagEn/content/images/",
    "/BookContent/TalkingBagEn/content/audio/");

// Initialize the app, beginning to read the content file, parsing  and displaying the book
app.initialize();