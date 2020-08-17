var Crawler = require("crawler");
var fs = require('fs');
var path = require("path");
var ResourceManager = require("./resource-manager");

const UserAgentName = 'DomainCrawler';
const DefaultOutputPath = 'output/'

const TAG_SCRIPT = 'script';
const TAG_IMG = 'img';
const ATTR_SRC = 'src';

var rootUrl = '';

const getSubUrl = (Url) => {
    if (Url) {
        var url = Url.toLowerCase();
        if (url === '/') { // self URL
            return null;
        } else if (url.startsWith(rootUrl) && url.length > rootUrl.length) { // match to rootUrl & longer
            return Url.substr(rootUrl.length)
        } else if (url.startsWith('http')) { // full URL, but not match
            return null;
        } else if (url.startsWith('mailto')) { // email
            return null;
        } else if (url.startsWith('//')) { // root URL
            return null;
        } else if (url.startsWith('/')) {
            return Url.substr(1); // remove first '/'
        } else {
            return Url;
        }
    }

    return null;
}

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

const combineUrl = (root, add) => {
    if (lastChar(root) === '/' && firstChar(add) === '/') {
        return root + add.substring(1);
    } else if (lastChar(root) !== '/' && firstChar(add) !== '/') {
        return root + "/" + add;
    } else {
        return root + add;
    }
}

var crawler = new Crawler({
    encoding: null,
    maxonnections: 10,
    userAgent: UserAgentName, // to avoid "400 Bad Request" from SEDNA

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            var basename = path.basename(res.url);
            var filename = DefaultOutputPath + (res.options.filename ? res.options.filename : basename);

            if (res.options && res.options.adjustHtml) {
                var $ = res.$;
                // $ is Cheerio by default
                console.log($("title").text());

                const srcProcess = (i, aTag) => {
                    var src = $(aTag).attr(ATTR_SRC);
                    if (src) {
                        console.log("aTag:" + i + "-" + src + " (len=" + src.length + ")");

                        var subUrl = getSubUrl(src);
                        if (!subUrl) { // full URL
                            var resFilename = ResourceManager.addResource(src, null);
                            // update src
                            $(aTag).attr(ATTR_SRC, resFilename);

                            crawler.queue(
                                {
                                    url: src.startsWith("//") ? "https:" + src : src,
                                    filename: resFilename,
                                    adjustHtml: false
                                }
                            );
                        }
                    }
                }

                var scripts = $(TAG_SCRIPT);
                scripts.each(srcProcess);

                var images = $(TAG_IMG);
                images.each(srcProcess);

                var links = $("a");
                links.each(function (i, link) {
                    var href = $(link).attr("href");
                    if (href) {
                        console.log("link:" + i + "-" + href + " (len=" + href.length + ")");

                        var subUrl = getSubUrl(href);
                        if (subUrl) {
                            var ext = path.extname(subUrl);
                            var linkFilename = subUrl;
                            if (!ext || ext === subUrl) {
                                linkFilename = subUrl + '.html';
                                $(link).attr("href", linkFilename);
                            }

                            var curUrl = res.request.href;

                            console.log("add SubURL:" + i + "-" + curUrl + " ~ " + subUrl);
                            crawler.queue(
                                {
                                    url: combineUrl(curUrl, subUrl),
                                    filename: linkFilename,
                                    adjustHtml: false
                                }
                            );
                        } else {
                            // filename = null; // to prevent saving
                        }
                    }
                });

                // save modified HTML
                if (filename) {
                    var wstream = fs.createWriteStream(filename);
                    wstream.write($.html());
                    wstream.end();
                }
            } else {
                if (filename) {
                    var wstream = fs.createWriteStream(filename, { encoding: 'binary' })
                    wstream.write(res.body);
                    wstream.end();
                }
            }

        }
        done();
    }
});

const DomainCrawler = {
    start: (entrance) => {
        rootUrl = entrance;

        crawler.queue({
            url: entrance, // 'https://www.sedna.com/'
            filename: 'index.html', // save entrance as file index.html, so it can be loaded from http-server
            adjustHtml: true
        });
    },
}

module.exports = DomainCrawler;