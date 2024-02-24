import rumble from "./index.js"
import { createWriteStream } from "fs"

//let testVideo = "v343twz" // video
let testVideo = "https://rumble.com/v4ffitz-saturday-warzone-craziness-rumbletakeover.html" // live

let filePipe = createWriteStream("testFile.mp4")

rumble.getInfo(testVideo)
.then(async (result) => {
    //console.log(result.video);

    let stream = await rumble.downloadFromInfo(result, {
        quality: "lowest"
    });

    stream.on("progress", (chunk, totalSize, percent) => {
        //console.log(`chunk size: ${chunk.length * 8.0e-6} megabits, total size: ${totalSize * 8.0e-6} megabits, percent: ${percent}`);
    })
    .on("end", () => {
        //console.log("End downloading");
    })
    .pipe(process.stdout)
    //.pipe(filePipe)
})