const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
const path = require("path")
//延迟函数
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
//开启反-反爬虫
puppeteer.use(StealthPlugin())


puppeteer.launch({headless: true,args: ['--no-sandbox']}).then(async browser => {
    const comicUrl = "https://www.cocomanga.com/10101/"
    let page = await browser.newPage();
    await page.goto(comicUrl)
    await page.waitForSelector(".fed-visible>.all_data_list>ul>li>a")
    let urlList = await page.evaluate('Array.from(document.querySelectorAll(".fed-visible>.all_data_list>ul>li>a")).map(item=>{return item.href})')
    urlList = urlList.reverse()
    const length = urlList.length
    await page.close()
    for (let i = 0; i < length; i++) {
        const url = urlList[i]
        console.log(`下载第${i + 1}话，共${length}话,url:${url}`)
        await comic(url.toString(), browser, i + 1)
    }

    // await comic("https://www.cocomanga.com/10101/1/920.html",browser,1)
    await browser.close()
})


async function comic(url, browser, count) {
    let page = await browser.newPage();
    await page.setViewport({width: 800, height: 99999})

    let buffers = new Map()
    page.on('response', response => {
        if (response.ok() && response.url().indexOf("cocomanga.com") > -1) {
            buffers.set(response.url().toString(), response.buffer())
        }
    });
    await page.goto(url)

    await page.waitForSelector(".mh_comicpic img")
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
        }
        //扩展名
        let ext = path.extname(url);
        fs.writeFile(path.join(dir, `${i}${ext}`), await img, err => {
            if (err) {
                console.error(err)
            }
        })
    }
    await page.close()
}
