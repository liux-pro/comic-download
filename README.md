# 漫画下载
从cocomanga.com下载漫画
# libs
puppeteer 与浏览器交互  
puppeteer-extra 隐藏爬虫特征  
puppeteer-extra-plugin-stealth 隐藏爬虫特征  

# 过程
网站图片通过html内放一些加密参数，然后本地用加密js解密，加载图片，本来想解密图片地址的，但是有点困难，因为本地js也是加密的，看不到算法。  

这样，才通过puppeteer这种东西下载漫画。

# 问题
## 懒加载
图片是懒加载的，`<img>`的dom预先渲染，但是`src`为暂时为空，通过无限滚动那样懒加载。
原来是想通过控制滚动条不停的向下滚动，滚到头再开始搞。[参考](https://github.com/chenxiaochun/blog/issues/38)
```js
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}
```
后来想想如果把chrome的高度设的很大，那么就不用滚动了，这就简单多了。
```js
page.setViewport({width: 800, height: 99999})
```
## 响应体为空但是获取响应体会报错
https://github.com/puppeteer/puppeteer/issues/2176#issuecomment-434665348
