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
import * as cheerio from "cheerio"
import { PassThrough } from "stream"
import HLS from 'hls-parser';

class ProgressPassThrough extends PassThrough {
    constructor(options) {
        super(options);
        this.downloaded = 0;
        this.totalSize = 0;
    }

    write(chunk, encoding, callback) {
        this.downloaded += chunk.length;
        this.emit('progress', chunk, this.totalSize, (this.downloaded / this.totalSize) * 100);

        return super.write(chunk, encoding, callback);
    }
}

const rumble_core = fetchVideo

async function fetchVideo(videoURL, options = {}) {
    const info = await rumble_core.getInfo(videoURL)

    return rumble_core.downloadFromInfo(info);
}

async function getVideoFormatInfo(videoID, options) {
    let url = `https://rumble.com/embedJS/u3/?request=video&ver=2&v=${videoID}&ext=%7B%22ad_count%22%3Anull%7D&ad_wt=112`

    const response = await gaxios.request({
        url: url,
        method: "GET",
        ...options.requestOptions
    });

    return response.data;
}

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
    const videoFormatInfo = await getVideoFormatInfo(response.data.match(/"video":"(.*?)"/)[1], options);

    const $ = cheerio.load(response.data)

    let descriptionElements = $(".media-description");
    let description = ""

    descriptionElements.find('p').each(function () {
        $(this).find("button").remove();
        $(this).find("br").replaceWith('\n');

        description += $(this).html() + ' \n';
    });

    let tagElements = $(".media-description-tags-container");
    let tags = []

    tagElements.find('a').each(function () {
        tags.push({
            text: $(this).text().trim(),
            url: $(this).attr("href")
        })
    });

    let formats = Object.values(videoFormatInfo.ua.mp4).map((v) => {
        return {
            url: v.url,
            bitrate: v.meta.bitrate / 1000,
            size: v.meta.size / 100000,
            height: v.meta.h,
            width: v.meta.w
        }
    })

    if (formats.length == 0) {
        let hlsResponse = await gaxios.request({
            url: videoFormatInfo.u.hls.url,
            method: "GET",
            ...options.requestOptions
        });

        options.requestCallback(hlsResponse);

        let HLSData = HLS.parse(await hlsResponse.data.text());

        formats = HLSData.variants.map((v) => {
            return {
                url: v.uri,
                bitrate: v.bandwidth / 1.0e+6,

                height: v.resolution.height,
                width: v.resolution.width
            }
        })
    }

    let result = {
        video: {
            publicID: videoURL.split("-")[0].split("/").pop(),
            privateID: response.data.match(/"video":"(.*?)"/)[1],
            pageURL: videoFormatInfo.l,
            livestream_has_dvr: videoFormatInfo.livestream_has_dvr,
            own: videoFormatInfo.own,
            title: videoFormatInfo.title,
            description: description.trim(),
            likes: convertAbbreviatedNumber($("button.rumbles-vote-pill-up.rumblers-vote-pill-button > span").text()),
            dislikes: convertAbbreviatedNumber($("button.rumbles-vote-pill-down.rumblers-vote-pill-button > span").text()),
            views: convertAbbreviatedNumber($("div.media-description-time-views-container > div.media-description-info-views").text().trim()),
            uploadDate: new Date(videoFormatInfo.pubDate),
            duration: videoFormatInfo.duration,
            live: videoFormatInfo.live > 0,
            tags: tags,
            thumbnails: (videoFormatInfo.t || []).map((v) => {
                return {
                    url: v.i,
                    height: v.h,
                    width: v.w
                }
            }),
            formats: formats,
            timeline: videoFormatInfo.ua.timeline && {
                url: videoFormatInfo.ua.timeline["180"].url,
                bitrate: videoFormatInfo.ua.timeline["180"].meta.bitrate / 1000,
                size: videoFormatInfo.ua.timeline["180"].meta.size / 1000,
                height: videoFormatInfo.ua.timeline["180"].meta.h,
                width: videoFormatInfo.ua.timeline["180"].meta.w,
            }
        },
        author: {
            name: videoFormatInfo.author.name,
            followers: convertAbbreviatedNumber($("div.media-by-channel-container > a > div > div.media-heading-num-followers").text().trim().split("\t")[0]),
            // image:
            url: videoFormatInfo.author.url
        }
    };

    return result;
};

rumble_core.downloadFromInfo = async function (info, options = {}) {
    console.log(info)
    if(info.video.live){
        throw new Error("Downloading live video not supported yet.")
    }

    options = {
        begin: info.video.live ? Date.now() : 0,
        range: { start: 0, end: 0 },
        //highWaterMark: 512 * 1024, // disabled for now
        //IPv6Block: "2001:2::/48", // disabled for now
        ...options,
    }

    if (options.range.end == 0) {
        let headerResponse = (await gaxios.request({
            url: [...info.video.formats].sort((a, b) => a.width < b.width).pop().url,
            method: "HEAD"
        }))

        options.range.end = parseInt(headerResponse.headers['content-length'])
    }

    let response = await gaxios.request({
        url: [...info.video.formats].sort((a, b) => a.width < b.width).pop().url,
        responseType: 'stream',
        headers: {
            Range: `bytes=${options.range.start}-${options.range.end}`,
            ["User-Agent"]: userAgent,
        }
    })

    const progressStream = new ProgressPassThrough()
    progressStream.totalSize = parseInt(response.headers['content-length']);
    response.data.pipe(progressStream)

    return progressStream;
};

/*rumble_core.chooseFormat = function (formats, options = "videoandaudio") {
    if (!["videoandaudio", "audioandvideo", "video", "audio", "videoonly", "audioonly"].includes(options)) {
        throw new Error(`Options can only be "videoandaudio", "audioandvideo, "video", "audio", "videoonly" or "audioonly".`);
    }
}*/

rumble_core.validateURL = function (url) {

}

rumble_core.version = "1.0.0"
export default rumble_core