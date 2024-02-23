import rumble from "./index.js"
import { createWriteStream } from "fs"

//let testVideo = "https://rumble.com/v343twz-best-wireless-router-in-2023-asus-rt-axe7800-review.html" // video
let testVideo = "https://rumble.com/v3tis7p-infowars-network-feed-live-247.html" // live

let filePipe = createWriteStream("testFile.mp4")

rumble.getInfo(testVideo)
.then(async (result) => {
    console.log(result.video);

    (await rumble.downloadFromInfo(result, {

    }))
    .on("progress", (chunk, totalSize, percent) => {
        console.log(`chunk size: ${chunk.length * 8.0e-6} megabits, total size: ${totalSize * 8.0e-6} megabits, percent: ${percent}`);
    })
    .on("end", () => {
        console.log("End downloading");
    })
    .pipe(filePipe)
})