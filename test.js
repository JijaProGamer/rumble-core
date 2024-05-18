let { createWriteStream } = require("fs")
let rumble = require("./index.js")

//let testVideo = "v343twz" // video
//let testVideo = "https://rumble.com/v1heynx-lofi-hip-hop-radio-beats-to-relaxstudy-to.html" // live 24/7
let testVideo = "v3ojoy2" // fast paced live, temporary

let filePipe = createWriteStream("testFile.mp4")

rumble.getInfo(testVideo)
.then(async (result) => {
    console.log(result);

    /*let stream = await rumble.downloadFromInfo(result, {
        quality: "highest"
    });

    stream.on("progress", (chunk, totalSize, percent) => {
        //console.log(`chunk size: ${chunk.length * 8.0e-6} megabits, total size: ${totalSize * 8.0e-6} megabits, percent: ${percent}`);
    })
    .on("end", () => {
        //console.log("End downloading");
    })
    .pipe(process.stdout)*/
    //.pipe(filePipe)
})