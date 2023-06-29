import { BookType, } from "../Models/Models";
import { Splide } from "@splidejs/splide";
export class PlayBackEngine {
    constructor(imagesPath, audioPath) {
        this.emptyGlowImageTag = "empty_glow_image";
        this.imagesPath = imagesPath;
        this.audioPath = audioPath;
        this.currentPage = 0;
        this.splideHandle = new Splide(".splide", {
            fixedHeight: window.innerHeight - 20,
        }).mount();
        this.splideHandle.on("move", (newIndex, oldIndex, destIndex) => {
            this.transitioningToPage = true;
            this.stopPageAudio(this.book.pages[oldIndex]);
        });
        this.splideHandle.on("moved", (currentIndex, prevIndex, destIndex) => {
            this.currentPage = currentIndex;
            this.transitioningToPage = false;
            this.playPageAudio(this.book.pages[currentIndex]);
        });
        this.addPageResizeListener();
    }
    stopPageAudio(page) {
        for (let i = 0; i < page.visualElements.length; i++) {
            let visualElement = page.visualElements[i];
            if (visualElement.type === "audio") {
                let audioElement = visualElement;
                let audioElementDom = document.getElementById(audioElement.domID);
                audioElementDom.pause();
                audioElementDom.currentTime = 0;
                clearInterval(this.currentPageAutoPlayerInterval);
                for (let j = 0; j < audioElement.audioTimestamps.timestamps.length; j++) {
                    let wordElement = document.getElementById(audioElement.domID + "_word_" + j);
                    wordElement.classList.remove("cr-clickable-word-active");
                }
            }
        }
    }
    playPageAudio(page) {
        for (let i = 0; i < page.visualElements.length; i++) {
            let visualElement = page.visualElements[i];
            if (visualElement.type === "audio") {
                let audioElement = visualElement;
                let audioElementDom = document.getElementById(audioElement.domID);
                audioElementDom.play();
                let lastWordIndex = 0;
                let currentIndex = 0;
                this.currentPageAutoPlayerInterval = setInterval(() => {
                    if (audioElement.audioTimestamps !== undefined) {
                        let currentTime = audioElementDom.currentTime;
                        for (let j = 0; j < audioElement.audioTimestamps.timestamps.length; j++) {
                            if (currentTime >= audioElement.audioTimestamps.timestamps[j].startTimestamp && currentTime <= audioElement.audioTimestamps.timestamps[j].endTimestamp) {
                                currentIndex = j;
                                let wordElement = document.getElementById(audioElement.domID + "_word_" + currentIndex);
                                wordElement.classList.add("cr-clickable-word-active");
                                wordElement.style.color = audioElement.glowColor;
                            }
                            if (lastWordIndex < currentIndex) {
                                let wordElement = document.getElementById(audioElement.domID + "_word_" + lastWordIndex);
                                wordElement.classList.remove("cr-clickable-word-active");
                                wordElement.style.color = "white";
                                lastWordIndex = currentIndex;
                            }
                        }
                        if (currentTime >= audioElement.audioTimestamps.timestamps[audioElement.audioTimestamps.timestamps.length - 1].endTimestamp - 0.1) {
                            let wordElement = document.getElementById(audioElement.domID + "_word_" + currentIndex);
                            wordElement.classList.remove("cr-clickable-word-active");
                            wordElement.style.color = "white";
                            clearInterval(this.currentPageAutoPlayerInterval);
                        }
                    }
                }, 60);
            }
        }
    }
    addPageResizeListener() {
        window.addEventListener("resize", () => {
            this.splideHandle.options.fixedHeight = window.innerHeight - 20;
            this.splideHandle.refresh();
        });
    }
    initializeBook(book) {
        this.book = book;
        this.currentBookType = book.bookType;
        this.numberOfPages = book.pages.length;
        if (this.currentBookType === BookType.CuriousReader) {
            this.initializeCuriousReaderBook(book);
        }
        else if (this.currentBookType === BookType.GDL) {
            this.initializeGDLBook(book);
        }
    }
    initializeCuriousReaderBook(book) {
        this.numberOfPages = book.pages.length;
        for (let i = 0; i < book.pages.length; i++) {
            const slide = document.createElement("li");
            slide.classList.add("splide__slide");
            let sentenceInitializedByAudio = false;
            for (let j = 0; j < book.pages[i].visualElements.length; j++) {
                let visualElement = book.pages[i].visualElements[j];
                if (visualElement.type == "image") {
                    let imageElement = visualElement;
                    let pageIndex = i;
                    slide.appendChild(this.createImageContainer(pageIndex, imageElement));
                }
                else if (visualElement.type == "audio") {
                    sentenceInitializedByAudio = true;
                    let audioElement = visualElement;
                    let textElement = null;
                    for (let j = 0; j < book.pages[i].visualElements.length; j++) {
                        let visualElement = book.pages[i].visualElements[j];
                        if (visualElement.type == "text") {
                            textElement = visualElement;
                            break;
                        }
                    }
                    if (textElement) {
                        let audioAndTextDivs = this.createAudioAndTextContainers(i, audioElement, textElement);
                        slide.appendChild(audioAndTextDivs[0]);
                        slide.appendChild(audioAndTextDivs[1]);
                    }
                    else {
                        slide.appendChild(this.createAudioContainer(audioElement));
                    }
                }
                this.splideHandle.add(slide);
            }
            if (!sentenceInitializedByAudio) {
                for (let j = 0; j < book.pages[i].visualElements.length; j++) {
                    let visualElement = book.pages[i].visualElements[j];
                    if (visualElement.type == "text") {
                        let textElement = visualElement;
                        slide.appendChild(this.createTextContainer(textElement));
                    }
                }
            }
        }
    }
    createTextContainer(textElement) {
        let textElementDiv = document.createElement("div");
        textElementDiv.id = "cr-text";
        textElementDiv.classList.add("cr-text");
        textElementDiv.style.position = "absolute";
        textElementDiv.style.webkitTextStroke = "1px #303030";
        textElementDiv.style.color = "#FFFFFF";
        textElementDiv.style.textShadow = "0.1rem 0.15rem 0.1rem #303030";
        textElementDiv.style.fontFamily = "Quicksand";
        textElementDiv.style.fontWeight = "800";
        textElementDiv.style.fontSize = "1.7em";
        textElementDiv.style.top = textElement.positionY + "%";
        textElementDiv.style.left = textElement.positionX + "%";
        textElementDiv.style.width = textElement.width + "%";
        textElementDiv.style.height = textElement.height + "%";
        textElementDiv.innerHTML = textElement.textContentAsHTML;
        return textElementDiv;
    }
    createImageContainer(pageIndex, imageElement) {
        let imageElementDiv = document.createElement("div");
        imageElementDiv.style.position = "absolute";
        imageElementDiv.style.top = imageElement.positionY + "%";
        imageElementDiv.style.left = imageElement.positionX + "%";
        imageElementDiv.style.width = imageElement.width + "%";
        imageElementDiv.style.height = imageElement.height + "%";
        if (imageElement.imageSource === this.emptyGlowImageTag) {
            imageElementDiv.classList.add("cr-image-empty-glow");
            imageElementDiv.classList.add(imageElement.domID);
            imageElementDiv.addEventListener("click", () => {
                this.handleGlowImageClick(pageIndex, imageElement.domID.split("_")[1]);
            });
        }
        else {
            imageElementDiv.id = imageElement.domID;
            imageElementDiv.classList.add("cr-image");
            let imageElementImg = document.createElement("img");
            imageElementImg.src =
                this.imagesPath + imageElement.imageSource.replace("images/", "");
            imageElementImg.style.width = "100%";
            imageElementImg.style.height = "100%";
            imageElementDiv.appendChild(imageElementImg);
        }
        return imageElementDiv;
    }
    createAudioContainer(audioElement) {
        let audioElementDiv = document.createElement("div");
        audioElementDiv.classList.add("cr-audio");
        audioElementDiv.style.position = "absolute";
        let pageAudio = document.createElement("audio");
        pageAudio.id = audioElement.domID;
        pageAudio.src = this.audioPath + audioElement.audioSrc.replace("audios/", "");
        pageAudio.controls = false;
        audioElementDiv.appendChild(pageAudio);
        if (audioElement.audioTimestamps !== undefined) {
            for (let i = 0; i < audioElement.audioTimestamps.timestamps.length; i++) {
                let wordTimestampElement = audioElement.audioTimestamps.timestamps[i];
                let wordAudioElement = document.createElement("audio");
                wordAudioElement.id = wordTimestampElement.domID;
                wordAudioElement.src = this.audioPath + wordTimestampElement.audioSrc.replace("audios/", "");
                wordAudioElement.controls = false;
                audioElementDiv.appendChild(wordAudioElement);
            }
        }
        return audioElementDiv;
    }
    createAudioAndTextContainers(pageIndex, audioElement, textElement) {
        let audioAndTextArray = Array();
        let audioElementDiv = document.createElement("div");
        audioElementDiv.classList.add("cr-audio");
        audioElementDiv.style.position = "absolute";
        let pageAudio = document.createElement("audio");
        pageAudio.id = audioElement.domID;
        pageAudio.src = this.audioPath + audioElement.audioSrc.replace("audios/", "");
        pageAudio.controls = false;
        audioElementDiv.appendChild(pageAudio);
        let sentenceArrayTrimmed = Array();
        if (audioElement.audioTimestamps !== undefined) {
            for (let i = 0; i < audioElement.audioTimestamps.timestamps.length; i++) {
                let wordTimestampElement = audioElement.audioTimestamps.timestamps[i];
                let wordAudioElement = document.createElement("audio");
                wordAudioElement.id = wordTimestampElement.domID;
                wordAudioElement.src = this.audioPath + wordTimestampElement.audioSrc.replace("audios/", "");
                wordAudioElement.controls = false;
                sentenceArrayTrimmed.push(wordTimestampElement.word.trim());
                audioElementDiv.appendChild(wordAudioElement);
            }
        }
        audioAndTextArray.push(audioElementDiv);
        let audioContentDOMId = audioElement.domID;
        let textElementDiv = document.createElement("div");
        textElementDiv.id = "cr-text";
        textElementDiv.classList.add("cr-text");
        textElementDiv.style.position = "absolute";
        textElementDiv.style.webkitTextStroke = "1px #303030";
        textElementDiv.style.color = "#FFFFFF";
        textElementDiv.style.textShadow = "0.1rem 0.15rem 0.1rem #303030";
        textElementDiv.style.fontFamily = "Quicksand";
        textElementDiv.style.fontWeight = "800";
        textElementDiv.style.fontSize = "1.7em";
        textElementDiv.style.top = textElement.positionY + "%";
        textElementDiv.style.left = textElement.positionX + "%";
        textElementDiv.style.width = textElement.width + "%";
        textElementDiv.style.height = textElement.height + "%";
        let sentenceParagraph = document.createElement("p");
        sentenceParagraph.style.textAlign = "center";
        sentenceParagraph.style.fontSize = "1.75em";
        for (let i = 0; i < sentenceArrayTrimmed.length; i++) {
            let clickableWordElement = document.createElement("div");
            clickableWordElement.id = audioContentDOMId + "_word_" + i;
            clickableWordElement.classList.add("cr-clickable-word");
            clickableWordElement.style.margin = "10px";
            clickableWordElement.innerText = sentenceArrayTrimmed[i];
            clickableWordElement.addEventListener("click", (ev) => {
                this.handleInteractiveWordClick(pageIndex, i);
            });
            sentenceParagraph.appendChild(clickableWordElement);
        }
        textElementDiv.appendChild(sentenceParagraph);
        audioAndTextArray.push(textElementDiv);
        return audioAndTextArray;
    }
    handleGlowImageClick(pageIndex, wordIndex) {
        let wordIndexNumber = parseInt(wordIndex);
        this.handleInteractiveWordClick(pageIndex, wordIndexNumber);
    }
    handleInteractiveWordClick(pageIndex, wordIndex) {
        let page = this.book.pages[pageIndex];
        for (let i = 0; i < page.visualElements.length; i++) {
            let visualElement = page.visualElements[i];
            if (visualElement.type === "audio") {
                let audioElement = visualElement;
                let wordAudioElement = document.getElementById(audioElement.audioTimestamps.timestamps[wordIndex].domID);
                let wordElement = document.getElementById(audioElement.domID + "_word_" + wordIndex);
                wordElement.classList.add("cr-clickable-word-active");
                wordElement.style.color = audioElement.glowColor;
                let connectedGlowImageClass = "img" + audioElement.domID + "_" + wordIndex;
                let connectedGlowImages = document.getElementsByClassName(connectedGlowImageClass);
                for (let i = 0; i < connectedGlowImages.length; i++) {
                    let glowDiv = connectedGlowImages[i];
                    glowDiv.style.boxShadow = audioElement.glowColor + " 0px 0px 20px 20px";
                }
                setTimeout(() => {
                    wordElement.classList.remove("cr-clickable-word-active");
                    wordElement.style.color = "white";
                    for (let i = 0; i < connectedGlowImages.length; i++) {
                        let glowDiv = connectedGlowImages[i];
                        glowDiv.style.boxShadow = "transparent 0px 0px 20px 20px";
                    }
                }, 600);
                wordAudioElement.play();
            }
        }
    }
    initializeGDLBook(book) {
        for (let i = 0; i < book.pages.length; i++) {
            const slide = document.createElement("li");
            slide.classList.add("splide__slide");
            let flexContainer = document.createElement("div");
            flexContainer.classList.add("gdl-flex-container");
            flexContainer.style.display = "flex";
            flexContainer.style.flexDirection = "column";
            flexContainer.style.justifyContent = "center";
            flexContainer.style.alignItems = "center";
            flexContainer.style.height = "100%";
            flexContainer.style.width = "100%";
            slide.appendChild(flexContainer);
            for (let j = 0; j < book.pages[i].visualElements.length; j++) {
                let visualElement = book.pages[i].visualElements[j];
                if (visualElement.type == "text") {
                    let textElement = visualElement;
                    let textElementDiv = document.createElement("div");
                    textElementDiv.style.width = "60%";
                    textElementDiv.classList.add("gdl-text");
                    textElementDiv.style.webkitTextStroke = "1px #303030";
                    textElementDiv.style.color = "#FFFFFF";
                    textElementDiv.style.textShadow = "0.1rem 0.15rem 0.1rem #303030";
                    textElementDiv.style.fontFamily = "Quicksand";
                    textElementDiv.style.fontWeight = "800";
                    textElementDiv.style.fontSize = "1.7em";
                    textElementDiv.innerHTML = textElement.textContentAsHTML;
                    flexContainer.appendChild(textElementDiv);
                }
                else if (visualElement.type == "image") {
                    let imageElement = visualElement;
                    let imageElementDiv = document.createElement("div");
                    imageElementDiv.classList.add("gdl-image");
                    let imageElementImg = document.createElement("img");
                    imageElementImg.src = this.imagesPath + imageElement.imageSource.replace("images/", "");
                    imageElementImg.style.width = "100%";
                    imageElementImg.style.height = "100%";
                    imageElementDiv.appendChild(imageElementImg);
                    flexContainer.appendChild(imageElementDiv);
                }
            }
            this.splideHandle.add(slide);
        }
    }
    goToNextPage() {
        if (this.transitioningToPage)
            return;
        if (this.currentPage < this.numberOfPages) {
            this.currentPage++;
        }
        this.transitionToPage(this.currentPage);
    }
    goToPreviousPage() {
        if (this.transitioningToPage)
            return;
        if (this.currentPage > 0) {
            this.currentPage--;
        }
        this.transitionToPage(this.currentPage);
    }
    transitionToPage(pageNumber) {
        this.transitioningToPage = true;
    }
}
//# sourceMappingURL=PlayBackEngine.js.map