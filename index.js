const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
const path = require("path")
//延迟函数
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
//开启反-反爬虫
puppeteer.use(StealthPlugin())


puppeteer.launch({headless: false, args: ['--no-sandbox']}).then(async browser => {
    const comicUrl = "https://www.cocomanga.com/10101/"
    let page = await browser.newPage();
    await page.goto(comicUrl)
    await page.waitForSelector(".fed-visible>.all_data_list>ul>li>a")
    let urlList = await page.evaluate('Array.from(document.querySelectorAll(".fed-visible>.all_data_list>ul>li>a")).map(item=>{return item.href})')
    urlList = urlList.reverse()
    const length = urlList.length
    await page.close()
    const timer = setInterval(async () => {
        console.log((await browser.pages()).length)
    }, 2000);

    let tasks = []
    for (let i = 0; i < 100; i++) {
        const url = urlList[i]
        console.log(`下载第${i + 1}话，共${length}话,url:${url}`)
        tasks.push(comic(url.toString(), browser, i + 1))
    }
    await Promise.all(tasks)

    // await comic("https://www.cocomanga.com/10101/1/920.html",browser,1)
    await browser.close()
})


async function comic(url, browser, count) {
    let page = await browser.newPage();
    page.setDefaultNavigationTimeout(120 * 1000)

    await page.setViewport({width: 800, height: 99999})

    let buffers = new Map()
    page.on('response',async response => {
        if (response.url().indexOf("img.cocomanga.com") > -1 ) {
            if (response.ok()){
                buffers.set(response.url().toString(), response.buffer())
            }else {
                // 存在图片加载失败
                console.log("图片加载失败")
                page.close()
            }
        }
    });
    await page.goto(url)

    await page.waitForSelector(".mh_comicpic img")
    //页面是懒加载的，等到最后一个img被赋上src之后再继续
    await page.waitForSelector(".mh_mangalist .mh_comicpic:last-child img[src]")
    const size = await page.evaluate('document.querySelectorAll(".mh_comicpic img").length')
    let title = await page.evaluate('document.querySelector(".mh_readtitle h1 *").innerText')
    title = title.toString().trim()
    const imgSrcList = await page.evaluate('Array.from(document.querySelectorAll(".mh_comicpic img")).map(item=>{return item.currentSrc})')

    console.log(`下载《${title}》,共${size}页`)

    if (size < 1) {
        console.error(url)
    }
    const dir = `${count}@${title}`
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
    for (let i = 0; i < imgSrcList.length; i++) {
        const url = imgSrcList[i].toString()
        //img buffer是个promise
        let img
        while (true) {
            img = buffers.get(url);
            if (img) {
                break;
            }
            await sleep(300)
            console.log(`${imgSrcList.length},,${buffers.size}`)
            console.log(buffers.keys())
            console.log(imgSrcList)
        }
        //扩展名
        let ext = path.extname(url);
        console.log(`before${count}--${i+1}/${imgSrcList.length}`)
        let data = await img;
        console.log(`write${count}--${i+1}/${imgSrcList.length}`)
        fs.writeFile(path.join(dir, `${i}${ext}`), data, err => {
            if (err) {
                console.error(err)
            }
        })
    }
    console.log(`关闭${count}`)
    await page.close()
}
