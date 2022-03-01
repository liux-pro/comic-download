const fs = require(
    "fs"
)

let files = fs.readdirSync(".");
const index = files.filter(file => {
    //文件名规则   index@pages@title
    //检查有没有两个@
    let first = file.indexOf("@");
    let last = file.lastIndexOf("@");
    return last > -1 && first > -1 && first !== last
}).filter(file => {
    //检查图片数量和实际数量相等
    let imageCount = parseInt(file.split("@")[1]);
    let count = fs.readdirSync(file).length;
    return imageCount === count
}).map(file => {
    //形成一个已下载序号列表
    return parseInt(file.split("@")[0])
})
console.log(index)
