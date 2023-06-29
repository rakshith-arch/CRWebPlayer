var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BookType, } from "../Models/Models";
export class ContentParser {
    constructor(contentFilePath) {
        this.emptyGlowImageTag = "empty_glow_image";
        this.contentFilePath = contentFilePath;
    }
    parseBook() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.parseContentJSONFile()
                    .then((contentJSON) => {
                    this.contentJSON = contentJSON;
                    console.log("Content JSON file parsed!");
                    console.log(this.contentJSON);
                    let book = {
                        bookName: "",
                        pages: [],
                        bookType: this.determineBookType(),
                    };
                    book.pages = this.parsePages(book);
                    resolve(book);
                })
                    .catch((error) => {
                    reject(error);
                });
            });
        });
    }
    determineBookType() {
        if (this.contentJSON["presentation"] !== undefined) {
            return BookType.CuriousReader;
        }
        else if (this.contentJSON["chapters"] !== undefined) {
            return BookType.GDL;
        }
        else {
            return BookType.Unknown;
        }
    }
    parsePages(book) {
        let pages = [];
        if (book.bookType === BookType.CuriousReader) {
            let pagesJSON = this.contentJSON["presentation"]["slides"];
            let globalFillColor = this.contentJSON["presentation"]["globalBackgroundSelector"]["fillGlobalBackground"];
            for (let i = 0; i < pagesJSON.length; i++) {
                let pageJSON = pagesJSON[i];
                let page = {
                    visualElements: [],
                    backgroundColor: globalFillColor,
                };
                page.visualElements = this.parsePageCR(pageJSON);
                pages.push(page);
            }
        }
        else if (book.bookType === BookType.GDL) {
            let pagesJSON = this.contentJSON["chapters"];
            let globalFillColor = "#FCFCF2";
            for (let i = 0; i < pagesJSON.length; i++) {
                let pageJSON = pagesJSON[i];
                let page = {
                    visualElements: [],
                    backgroundColor: globalFillColor,
                };
                page.visualElements = this.parsePageGDL(pageJSON);
                pages.push(page);
            }
        }
        else {
            console.log("Unknown book type!");
        }
        return pages;
    }
    parsePageCR(pageJSON) {
        let visualElements = [];
        let elementsJSON = pageJSON["elements"];
        for (let i = 0; i < elementsJSON.length; i++) {
            let libraryString = elementsJSON[i]["action"]["library"];
            if (libraryString.includes("AdvancedText")) {
                let textElement = this.parseTextElementCR(elementsJSON[i]);
                visualElements.push(textElement);
            }
            else if (libraryString.includes("Image")) {
                let imageElement = this.parseImageElementCR(elementsJSON[i]);
                visualElements.push(imageElement);
            }
            else if (libraryString.includes("Audio")) {
                let audioElement = this.parseAudioElementCR(elementsJSON[i]);
                visualElements.push(audioElement);
            }
        }
        return visualElements;
    }
    parsePageGDL(pageJSON) {
        let visualElements = [];
        let elementsJSONArray = pageJSON["params"]["content"];
        for (let i = 0; i < elementsJSONArray.length; i++) {
            let libraryString = elementsJSONArray[i]["content"]["library"];
            if (libraryString.includes("AdvancedText")) {
                let textElement = this.parseTextElementGDL(elementsJSONArray[i]["content"]["params"]);
                visualElements.push(textElement);
            }
            else if (libraryString.includes("Image")) {
                let imageElement = this.parseImageElementGDL(elementsJSONArray[i]["content"]["params"]);
                visualElements.push(imageElement);
            }
        }
        return visualElements;
    }
    parseTextElementCR(elementJSON) {
        let textElement = {
            type: "text",
            positionX: elementJSON["x"],
            positionY: elementJSON["y"],
            width: elementJSON["width"],
            height: elementJSON["height"],
            textContentAsHTML: elementJSON["action"]["params"]["text"],
        };
        return textElement;
    }
    parseTextElementGDL(elementJSON) {
        let textElement = {
            type: "text",
            positionX: NaN,
            positionY: NaN,
            width: NaN,
            height: NaN,
            textContentAsHTML: elementJSON["text"],
        };
        return textElement;
    }
    parseImageElementCR(elementJSON) {
        let path = "";
        if (elementJSON["action"]["params"]["file"] === undefined) {
            path = this.emptyGlowImageTag;
        }
        else {
            path = elementJSON["action"]["params"]["file"]["path"];
        }
        let imageElement = {
            domID: path === this.emptyGlowImageTag
                ? elementJSON["id"]
                : elementJSON["action"]["subContentId"],
            type: "image",
            positionX: elementJSON["x"],
            positionY: elementJSON["y"],
            width: elementJSON["width"],
            height: elementJSON["height"],
            imageSource: path,
        };
        return imageElement;
    }
    parseImageElementGDL(elementJSON) {
        let imageElement = {
            domID: "",
            type: "image",
            positionX: NaN,
            positionY: NaN,
            width: elementJSON["width"],
            height: elementJSON["height"],
            imageSource: elementJSON["file"]["path"],
        };
        return imageElement;
    }
    parseAudioElementCR(elementJSON) {
        let audioTimestamps = {
            timestamps: [],
        };
        let timestampsJSONArray = elementJSON["action"]["params"]["timeStampForEachText"];
        for (let i = 0; i < timestampsJSONArray.length; i++) {
            let timestampIndex = i;
            let timestampJSON = timestampsJSONArray[i];
            let timestamp = {
                domID: elementJSON["action"]["subContentId"] +
                    "_" +
                    timestampIndex.toString(),
                word: timestampJSON["text"],
                startTimestamp: timestampJSON["startDuration"],
                endTimestamp: timestampJSON["endDuration"],
                audioSrc: timestampJSON["wordfile"][0]["path"],
            };
            audioTimestamps.timestamps.push(timestamp);
        }
        let audioElement = {
            domID: elementJSON["action"]["subContentId"],
            type: "audio",
            positionX: elementJSON["x"],
            positionY: elementJSON["y"],
            width: elementJSON["width"],
            height: elementJSON["height"],
            glowColor: elementJSON["action"]["params"]["glowColor"],
            audioSrc: elementJSON["action"]["params"]["files"][0]["path"],
            audioTimestamps: audioTimestamps,
            styles: "",
        };
        return audioElement;
    }
    parseContentJSONFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", this.contentFilePath, true);
                xhr.responseType = "json";
                xhr.onload = function () {
                    let status = xhr.status;
                    if (status === 200) {
                        let response = xhr.response;
                        delete response["l10n"];
                        delete response["override"];
                        resolve(response);
                    }
                    else {
                        reject(xhr.response);
                    }
                };
                xhr.send();
            });
        });
    }
}
//# sourceMappingURL=ContentParser.js.map