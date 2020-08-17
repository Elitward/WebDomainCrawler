const Crawler = require("crawler");
const fs = require('fs');
const path = require("path");
const ResourceManager = require("./resource-manager");

const UserAgentName = 'DomainCrawler';
const DefaultOutputPath = 'output/'

const TAG_SCRIPT = 'script';
const TAG_IMG = 'img';
const ATTR_SRC = 'src';

let rootUrl = '';

const firstChar = (str) => {
    return str.substr(0, 1);
}

const lastChar = (str) => {
    if (str) {
        return str.substr(str.length - 1);
    } else {
        return null;
    }
}

const getSubUrl = (Url) => {
    if (Url) {
        let url = Url.toLowerCase();
        if (url === '/') { // self URL
            return null;
        } else if (url.startsWith(rootUrl) && url.length > rootUrl.length) { // match to rootUrl & longer
            let tail = Url.substr(rootUrl.length);
            return firstChar(tail) === '/' ? tail : '/' + tail;
        } else if (url.startsWith('http')) { // full URL, but not match
            return null;
        } else if (url.startsWith('mailto')) { // email
            return null;
        } else if (url.startsWith('//')) { // root URL
            return null;
        } else if (url.startsWith('/')) {
            // return Url.substr(1); // remove first '/'
            return Url;
        } else {
            return Url;
        }
    }

    return null;
}

const combineUrl = (root, add) => {
    if (firstChar(add) === '/') {
        let hostname = (new URL(root)).hostname; // www.sedna.com
        let domain = root.substr(0, root.indexOf(hostname) + hostname.length);
        return domain + add;
    } else {
        if (lastChar(root) === '/') {
            return root + add;
        } else {
            return root + "/" + add;
        }
    }
}

const saveFile = (filename, data) => {
    const ensureDirectoryExistence = (dirname) => {
        if (fs.existsSync(dirname)) {
            return true;
        }

        let parentdir = path.dirname(dirname);
        ensureDirectoryExistence(parentdir);
        fs.mkdirSync(dirname);
    }

    let dirname = path.dirname(filename);
    ensureDirectoryExistence(dirname);

    let wstream = fs.createWriteStream(filename)
    wstream.write(data);
    wstream.end();
}

let history = new Set()

const crawler = new Crawler({
    encoding: null,
    maxonnections: 10,
    userAgent: UserAgentName, // to avoid "400 Bad Request" from SEDNA

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            let basename = path.basename(res.url);
            let filename = DefaultOutputPath + (res.options.filename ? res.options.filename : basename);
            let curUrl = res.request.href;
            console.log("URL " + curUrl, JSON.stringify(res.options));

            if (res.options && res.options.adjustHtml) {
                const $ = res.$;
                // $ is Cheerio by default
                // console.log($("title").text());

                const srcProcess = (i, aTag) => {
                    let src = $(aTag).attr(ATTR_SRC);
                    if (src) {
                        // console.log("aTag:" + i + "-" + src + " (len=" + src.length + ")");

                        let subUrl = getSubUrl(src);
                        if (!subUrl) { // full URL
                            let resFilename = ResourceManager.addResource(src, null);
                            // update src
                            $(aTag).attr(ATTR_SRC, '/' + resFilename);

                            let url = src.startsWith("//") ? "https:" + src : src;
                            if (!history.has(url)) {
                                history.add(url);

                                crawler.queue(
                                    {
                                        url: url,
                                        filename: resFilename,
                                        adjustHtml: false
                                    }
                                );
                            }
                        }
                    }
                }

                if ($) {
                    let scripts = $(TAG_SCRIPT);
                    scripts.each(srcProcess);

                    let images = $(TAG_IMG);
                    images.each(srcProcess);

                    let links = $("a");
                    links.each(function (i, link) {
                        let href = $(link).attr("href");
                        if (href) {
                            // console.log("link:" + i + "-" + href + " (len=" + href.length + ")");

                            if (href === "https://www.sedna.com/terms-of-service") {
                                let stop = 0;
                            }

                            let subUrl = getSubUrl(href);
                            if (subUrl) {
                                let ext = path.extname(subUrl);
                                let linkFilename = subUrl;
                                if (!ext || ext === subUrl) {
                                    linkFilename = subUrl + '.html';
                                    linkFilename = linkFilename.replace("?", "_");
                                    $(link).attr("href", linkFilename);
                                }

                                let url = combineUrl(curUrl, subUrl);
                                console.log("add SubURL:" + i + "-" + curUrl + " ~ " + subUrl + " => " + url);
                                if (!history.has(url)) {
                                    history.add(url);

                                    crawler.queue(
                                        {
                                            url: url,
                                            filename: linkFilename,
                                            adjustHtml: true
                                        }
                                    );
                                }
                            } else {
                                // filename = null; // to prevent saving
                            }
                        }
                    });

                }
                // save modified HTML
                if (filename) {
                    saveFile(filename, $ ? $.html() : res.body);
                }
            } else {
                if (filename) {
                    saveFile(filename, res.body);
                }
            }

        }
        done();
    }
});

const DomainCrawler = {
    start: (entrance) => {
        rootUrl = entrance;

        history.add(entrance);
        crawler.queue({
            url: entrance, // 'https://www.sedna.com/'
            filename: 'index.html', // save entrance as file index.html, so it can be loaded from http-server
            adjustHtml: true
        });
    },
}

module.exports = DomainCrawler;