/*
    Video URL: https://rumble.com/v2as2vy-common-pc-building-mistakes-beginners-make-top-10-mistakes-2023.html
    Video info URL: https://rumble.com/v2as2vy-common-pc-building-mistakes-beginners-make-top-10-mistakes-2023.html
    Request video info URL: https://rumble.com/embedJS/u3/?request=video&ver=2&v=v286n1m&ext=%7B%22ad_count%22%3Anull%7D&ad_wt=112
*/

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.3"

function convertAbbreviatedNumber(abbreviatedString) {
    const abbreviations = {
        K: 1e3,
        M: 1e6,
        B: 1e9,
    };

    const match = abbreviatedString.match(/^(\d+(\.\d+)?)\s*([KMB])?$/i);

    if (!match) {
        throw new Error("Invalid format");
    }

    const [, number, , abbreviation] = match;
    const numericValue = parseFloat(number);

    if (isNaN(numericValue)) {
        throw new Error("Invalid number");
    }

    const multiplier = abbreviations[abbreviation?.toUpperCase()] || 1;

    return numericValue * multiplier;
}

function convertBitrateAbbreviatedNumber([number, bitrateAbbrevation]) {
    const abbreviations = {
        "kbps": 0.001,
        "mbps": 1
    };

    return abbreviations[bitrateAbbrevation] * parseFloat(number);
}

import gaxios from "gaxios"
//import * as cheerio from "cheerio"
import { JSDOM, ResourceLoader, VirtualConsole } from "jsdom"

import { writeFileSync } from "fs"
const rumble_core = fetchVideo

async function fetchVideo(videoURL, options = {}) {
    throw new Error("Video fetch isn't implemented yet.")
}

/*rumble_core.getInfo = async function(videoURL, options={
    lang: "en",
    requestOptions: {},
    requestCallback: () => {},
}){
    let videoHTML = await gaxios.request({
        url: videoURL,
        method: "GET",
        ...options.requestOptions
    })

    options.requestCallback(videoHTML);

    let $ = cheerio.load(videoHTML.data);

    let descriptionElements = $(".media-description");
    let description = ""

    descriptionElements.find('p').each(function() {
        description += $(this).text() + ' \n';
    });

    let tagElements = $(".media-description-tags-container");
    let tags = []

    tagElements.find('a').each(function() {
        tags.push({
            content: $(this).text().trim(),
            href: $(this).attr("href")
        })
    });

    let resolutionElements = $("div > div:nth-child(4) > div:nth-child(3) > div:nth-child(8) > div:nth-child(2) > ul:nth-child(3)");
    let resolutions = []

    resolutionElements.find('li').each(function() {
        let resolutionText = $(this).find(":nth-child(2)")[0].text().trim().split(", ");

        resolutionText[0] = resolutionText[0].split("x");
        resolutionText[1] = resolutionText[0].split(" ");

        resolutions.push({
            resolution: {width: parseInt(resolutionText[0][1]), height: parseInt(resolutionText[0][1])},
            bitrate: convertBitrateAbbreviatedNumber(resolutionText)
        })
    });

    return {
        video: {
            title: $("div.video-header-container > h1").text().trim(),
            description: description.trim(),
            likes: convertAbbreviatedNumber($("button.rumbles-vote-pill-up.rumblers-vote-pill-button > span").text()),
            dislikes: convertAbbreviatedNumber($("button.rumbles-vote-pill-down.rumblers-vote-pill-button > span").text()),
            views: convertAbbreviatedNumber($("div.media-description-time-views-container > div.media-description-info-views").text().trim()),
            uploadDate: new Date($("div.media-description-info-stream-time > div").attr("title")),
            tags: tags,
            contentURL: $("video").attr("src"),
            resolutions: resolutions,
        },
        uploader: {
            name: $("div.media-by-channel-container > a > div > div.media-heading-name-wrapper > div").text().trim(),
            followers: convertAbbreviatedNumber($("div.media-by-channel-container > a > div > div.media-heading-num-followers").text().trim().split("\t")[0]),
            //image: 
            url: $("div.media-by-channel-container > a").attr("href").trim()
        }

        //description: ,
    }
};*/

rumble_core.getInfo = async function (videoURL, options = {
    lang: "en",
    requestOptions: {},
    requestCallback: () => { },
    referrer: "https://www.google.com"
}) {
    options = {
        lang: "en",
        requestCallback: () => { },
        ...options,
        requestOptions: {
            ...(options.requestOptions || {
                headers: {
                    ["User-Agent"]: userAgent
                }
            })
        },
    }

    const response = await gaxios.request({
        url: videoURL,
        method: "GET",
        ...options.requestOptions
    });

    options.requestCallback(response);

    let htmlData = response.data.replace('<video', '<div class="video"')
                    .replace('</video>', '</div>')

    const vConsole = new VirtualConsole();
    const dom = new JSDOM(htmlData, {
        url: videoURL,
        referrer: "https://google.com/",
        contentType: "text/html",
        includeNodeLocations: false,
        storageQuota: 10000000,
        runScripts: "dangerously",
        virtualConsole: vConsole,
        resources: new ResourceLoader({
            //proxy: "http://127.0.0.1:9001",
            strictSSL: true,
            userAgent: (options.requestOptions.headers || {})["User-Agent"] || userAgent,
        }),
        pretendToBeVisual: true,
        userAgent: (options.requestOptions.headers || {})["User-Agent"] || userAgent
    });

    const document = dom.window.document;

    await new Promise(resolve => {
        dom.window.onload = () => {
            resolve();
        };
    });

    const descriptionElements = document.querySelectorAll(".media-description");
    let description = "";

    descriptionElements.forEach(element => {
        if (element.tagName !== "P") return;

        description += element.textContent + ' \n';
    });

    const tagElements = document.querySelector(".media-description-tags-container");
    const tags = [];

    tagElements.querySelectorAll("a").forEach(element => {
        tags.push({
            content: element.textContent.trim(),
            href: element.getAttribute("href")
        });
    });

    const resolutionElements = document.querySelector("div > div:nth-child(4) > div:nth-child(3) > div:nth-child(8) > div:nth-child(2) > ul:nth-child(3)");
    const resolutions = [];

    /*writeFileSync("sucka.html", dom.serialize())

    await new Promise(resolve => {
        let interval = setInterval(() => {
            console.log(document.querySelector(`#vid_undefined > div`))
            if(document.querySelector(`div[class="video"]`)){
                clearInterval(interval);
                resolve()
            }
        }, 100)
    });*/

    /*resolutionElements.querySelectorAll("li").forEach(element => {
        const resolutionText = element.querySelector(":nth-child(2)").textContent.trim().split(", ");

        resolutionText[0] = resolutionText[0].split("x");
        resolutionText[1] = resolutionText[1].split(" ");

        resolutions.push({
            resolution: { width: parseInt(resolutionText[0][1]), height: parseInt(resolutionText[0][0]) },
            bitrate: convertBitrateAbbreviatedNumber(resolutionText)
        });
    });*/

    let result = {
        video: {
            title: document.querySelector("div.video-header-container > h1").textContent.trim(),
            description: description.trim(),
            likes: convertAbbreviatedNumber(document.querySelector("button.rumbles-vote-pill-up.rumblers-vote-pill-button > span").textContent),
            dislikes: convertAbbreviatedNumber(document.querySelector("button.rumbles-vote-pill-down.rumblers-vote-pill-button > span").textContent),
            views: convertAbbreviatedNumber(document.querySelector("div.media-description-time-views-container > div.media-description-info-views").textContent.trim()),
            uploadDate: new Date(document.querySelector("div.media-description-info-stream-time > div").getAttribute("title")),
            tags: tags,
            //contentURL: document.querySelector(".video").getAttribute("src"),
            //resolutions: resolutions,
        },
        uploader: {
            name: document.querySelector("div.media-by-channel-container > a > div > div.media-heading-name-wrapper > div").textContent.trim(),
            followers: convertAbbreviatedNumber(document.querySelector("div.media-by-channel-container > a > div > div.media-heading-num-followers").textContent.trim().split("\t")[0]),
            // image:
            url: document.querySelector("div.media-by-channel-container > a").getAttribute("href").trim()
        }
    };

    dom.window.close();

    return result;
};

rumble_core.downloadFromInfo = async function (videoURL, options = {}) {
    throw new Error("Video fetch isn't implemented yet.")
};

rumble_core.chooseFormat = function (formats, options = "videoandaudio") {
    if (!["videoandaudio", "audioandvideo", "video", "audio", "videoonly", "audioonly"].includes(options)) {
        throw new Error(`Options can only be "videoandaudio", "audioandvideo, "video", "audio", "videoonly" or "audioonly".`);
    }
}

rumble_core.validateURL = function (url) {

}

rumble_core.version = "1.0.0"
export default rumble_core