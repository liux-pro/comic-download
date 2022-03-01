const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
const path = require("path")
//延迟函数
let sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const comicUrl = "https://www.cocomanga.com/10101/"
const concurrent = 50
const download_path = "download"
if (!fs.existsSync(download_path)) {
    fs.mkdirSync(download_path)
}

//断点续传
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

//开启反-反爬虫
puppeteer.use(StealthPlugin())

let all = 0
let success = 0
let fail = 0
let jump = 0

puppeteer.launch({headless: true, args: ['--no-sandbox']}).then(async browser => {
    let page = await browser.newPage();
    await page.goto(comicUrl)
    await page.waitForSelector(".fed-visible>.all_data_list>ul>li>a")
    const title = await page.evaluate('document.querySelector(".fed-part-eone.fed-font-xvi").innerHTML')
    let urlList = await page.evaluate('Array.from(document.querySelectorAll(".fed-visible>.all_data_list>ul>li>a")).map(item=>{return item.href})')
    urlList = urlList.reverse()
    const length = urlList.length
    all = length
    await page.close()
    const index = buildIndex(title).map(file => {
        //形成一个已下载序号列表
        return parseInt(file.split("@")[0])
    })

    const timer = setInterval(async () => {
        if (!browser.isConnected()) {
            clearInterval(timer)
        } else {
            console.log(`同时下载${(await browser.pages()).length - 1}个`)
        }

    }, 2000);

    let tasks = []
    for (let i = 0; i < urlList.length; i++) {
        if (index.includes((i + 1))) {
            console.log(`跳过第${i + 1}话，共${length}话`)
            jump++
            continue
        }
        const url = urlList[i]
        console.log(`下载第${i + 1}话，共${length}话,url:${url}`)
        while (((await browser.pages()).length - 1) > concurrent) {
            await sleep(1000)
        }
        tasks.push(comic(url.toString(), browser, i + 1, path.join(download_path, title)))
        await sleep(300)

    }
    await Promise.all(tasks)

    // await comic("https://www.cocomanga.com/10101/1/920.html",browser,1)
    await browser.close()
    console.log("___________________________________________________________________")
    console.log(`共${all}话，跳过${jump}个，本次成功下载${success}个，本次下载失败${fail}个`)
    if (all === jump + success) {
        const newIndex = buildIndex()
        fs.writeFileSync(path.join(download_path, `${title}.json`), JSON.stringify(newIndex))
        console.log(`全部下载成功，已生成${title}.json`)
    } else {
        console.log("部分下载失败，请重新执行")
    }
})


async function comic(url, browser, count, dir) {
    let page = await browser.newPage();
    page.setDefaultNavigationTimeout(120 * 1000)

    await page.setViewport({width: 800, height: 99999})

    let buffers = new Map()
    page.on('response', async response => {
        if (response.url().indexOf("img.cocomanga.com") > -1) {
            if (response.ok()) {
                buffers.set(response.url().toString(), await response.buffer())
            } else {
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


    if (imgSrcList.length !== buffers.size || size < 1) {
        console.log(`${count}，下载失败`)
        fail++
        await page.close()
        return
    }

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
    dir = path.join(dir, `${count}@${imgSrcList.length}@${title}`)
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
        fs.writeFile(path.join(dir, `${i + 1}${ext}`), img, err => {
            if (err) {
                console.error(err)
            }
        })
    }
    console.log(`成功下载${count}`)
    success++
    await page.close()
}
