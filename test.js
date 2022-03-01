const fs = require("fs")
const path = require("path")
const download_path = "download"

function buildIndex(title) {
    let files = fs.readdirSync(path.join(download_path, title));
    return files.filter(file => {
        //文件名规则   index@pages@title
        //检查有没有两个@
        let first = file.indexOf("@");
        let last = file.lastIndexOf("@");
        return last > -1 && first > -1 && first !== last
    }).filter(file => {
        //检查图片数量和实际数量相等
        let imageCount = parseInt(file.split("@")[1]);
        let count = fs.readdirSync(path.join(download_path, title, file)).length;
        return imageCount === count
    })
}
console.log(buildIndex("斗破苍穹"))
