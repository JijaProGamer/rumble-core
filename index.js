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
        //throw new Error("Invalid format");
        return null
    }

    const [, number, , abbreviation] = match;
    const numericValue = parseFloat(number);

    if (isNaN(numericValue)) {
        throw new Error("Invalid number");
    }

    const multiplier = abbreviations[abbreviation?.toUpperCase()] || 1;

    return numericValue * multiplier;
}

let gaxios = require("gaxios")
let cheerio = require("cheerio")
let HLS = require("hls-parser")
let he = require("he")
let { PassThrough } = require("stream")

class ProgressPassThrough extends PassThrough {
    constructor(options) {
        super(options);
        this.downloaded = 0;
        this.totalSize = 0;
        this.abortController = null;
    }

    write(chunk, encoding, callback) {
        this.downloaded += chunk.length;

        if (this.totalSize > 0) {
            let progress = (this.downloaded / this.totalSize) * 100;
            this.emit('progress', chunk, this.totalSize, progress);
        } else {
            this.emit('progress', chunk, null, null);
        }

        return super.write(chunk, encoding, callback);
    }

    _destroy(error, callback) {
        this.abortController.abort(error)
        callback(error)
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

async function getLivestreamSegments(videoURL, options) {
    const response = await gaxios.request({
        url: videoURL,
        method: "GET",
        ...options.requestOptions
    });

    return HLS.parse(await response.data.text()).segments;
}

rumble_core.getInfo = async function (videoURL, options = {
    lang: "en",
    requestOptions: {},
    requestCallback: () => { }
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

    let videoID = rumble_core.getVideoID(videoURL);
    videoURL = `https://rumble.com/${videoID}`;

    const response = await gaxios.request({
        url: videoURL,
        method: "GET",
        headers: {
            ["Accept-Language"]: options.lang || "en"
        },
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
            title: he.decode(videoFormatInfo.title),
            description: he.decode(description.trim()),
            likes: convertAbbreviatedNumber($("button.rumbles-vote-pill-up.rumblers-vote-pill-button > span").text()),
            dislikes: convertAbbreviatedNumber($("button.rumbles-vote-pill-down.rumblers-vote-pill-button > span").text()),
            views: convertAbbreviatedNumber($("div.media-description-time-views-container > div.media-description-info-views").text().trim() || $("div.live-video-view-count-status-count").text().trim()),
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
    options = {
        begin: info.video.live ? Date.now() : 0,
        range: { start: 0, end: 0 },
        liveFetchInterval: 2000,
        liveTimeoutDuration: 10000,
        highWaterMark: 512 * 1024,
        //IPv6Block: "2001:2::/48", // disabled for now
        ...options,
    }

    let formatChosen = rumble_core.chooseFormat(info.video.formats, options);
    if (!formatChosen) {
        throw new Error("No compatible format found.");
    }

    let headers = {
        ["User-Agent"]: userAgent,
        ["Accept-Language"]: "en"
    }

    if (!info.video.live) {
        if (options.range.end == 0) {
            let headerResponse = (await gaxios.request({
                url: formatChosen.url,
                method: "HEAD"
            }))

            options.range.end = parseInt(headerResponse.headers['content-length'])
        }

        headers["Range"] = `bytes=${options.range.start}-${options.range.end}`
    }

    const abortController = new AbortController();
    const progressStream = new ProgressPassThrough();
    let response;

    if (!info.video.live) {
        response = await gaxios.request({
            url: formatChosen.url,
            responseType: 'stream',
            headers: headers,
            signal: abortController.signal,
        })

        response.data.on("end", () => {
            progressStream.emit("end")
        })

        progressStream.totalSize = parseInt(response.headers['content-length']);
        response.data.pipe(progressStream, { end: false })
    } else {
        let liveURL = formatChosen.url.split("/");
        liveURL.pop();
        liveURL = liveURL.join("/")

        let lastDownloaded = Date.now();
        let lastPool = Date.now() - options.liveFetchInterval;
        let isDownloading = false;
        let failedLast = false;
        let lastID;

        let buffer = Buffer.allocUnsafe(options.highWaterMark);
        let bufferFill = 0;

        let livestreamFetchInterval = setInterval(async () => {
            if ((Date.now() - lastDownloaded) > options.liveTimeoutDuration) {
                progressStream.emit("end")

                clearInterval(livestreamFetchInterval);
                return;
            }

            if (isDownloading) return;
            if ((Date.now() - lastPool) > options.liveFetchInterval || failedLast) {
                lastPool = Date.now();

                getLivestreamSegments(formatChosen.url, options).then((livestreamFragments) => {
                    livestreamFragments = livestreamFragments.map((v) => {
                        return {
                            duration: v.duration,
                            start: new Date(info.video.uploadDate.getTime() + v.mediaSequenceNumber * v.duration * 1000),
                            url: `${liveURL}/${v.uri}`,
                            id: v.uri,
                        }
                    })

                    let lastFragment = livestreamFragments[livestreamFragments.length - 1]

                    if (lastID == lastFragment.id) {
                        return;
                    }

                    isDownloading = true;
                    lastID = lastFragment.id;

                    response = gaxios.request({
                        url: lastFragment.url,
                        responseType: 'stream',
                        headers: headers,
                        signal: abortController.signal
                    }).then((response) => {
                        response.data.on("end", () => {
                            isDownloading = false;
                            lastDownloaded = Date.now()
                        })

                        response.data.on("data", (chunk) => {
                            if ((bufferFill + chunk.length) < options.highWaterMark) {
                                chunk.copy(buffer, bufferFill);
                                bufferFill += chunk.length;
                            } else {
                                const remainingSpace = options.highWaterMark - bufferFill;

                                chunk.copy(buffer, bufferFill, 0, remainingSpace);
                                progressStream.write(buffer);
                                bufferFill = 0;

                                const remainingData = chunk.slice(remainingSpace);
                                remainingData.copy(buffer, bufferFill);
                                bufferFill = remainingData.length;
                            }
                        })

                        //response.data.pipe(progressStream, { end: false })
                    }).catch((err) => {
                        failedLast = true;
                        isDownloading = false;
                    })
                }).catch((err) => {
                    failedLast = false;
                });
            }
        }, 250)
    }

    progressStream.emit("info", info, formatChosen)
    progressStream.abortController = abortController;

    return progressStream;
};

rumble_core.chooseFormat = function (formats, options = {}) {
    options = {
        quality: "highest",
        ...options
    }

    if (options.format) {
        return options.format;
    }

    if (!options.filter) {
        if (options.quality == "highest") {
            options.filter = (a, b) => a.width - b.width;
        }

        if (options.quality == "lowest") {
            options.filter = (a, b) => b.width - a.width;
        }
    }

    return [...formats].sort(options.filter).pop();
}

rumble_core.getVideoID = function (url) {
    return url.split("/").pop().split("-").shift()
}

module.exports = rumble_core