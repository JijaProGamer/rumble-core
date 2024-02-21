import rumble from "./index.js"

rumble.getInfo("https://rumble.com/v2as2vy-common-pc-building-mistakes-beginners-make-top-10-mistakes-2023.html")
.then((result) => {
    console.log(result);
})