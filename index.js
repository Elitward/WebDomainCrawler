var Crawler = require("crawler");
var fs = require('fs');
var path = require("path");
var md5 = require('md5');

const UserAgentName = "Eli's Crawler"
const DefaultOutputPath = 'output/'

// Key-Value pair, from Original URL to Saved Resource File: Resources[URL]=filename 
// (if same URL is referenced more than one, it will make to same filename)
const Resources = [];

const GetResourceFilename = (url) => {
    var basename = path.basename(url);
    var extension = path.extname(url);
    var urlMd5 = md5(url);
    console.log("GetResourceFilename:" + urlMd5 + " ~ " + url);
    return 'resource/' + urlMd5 + extension;

    // if(basename.length>64){
    //     basename = basename.substr(0, 60)
    // }
    // console.log("GetResourceFilename:" + basename + extension + " ~ " + url);
    // return 'resource/' + basename + extension;
}

const IsSubUrl = (Url) => {
    if (Url) {
        var url = Url.toLowerCase();
        if (url==='/') { // self URL
            return false;
        }
        else if (url.startsWith('http')) { // full URL
            return false;
        }
        else if (url.startsWith('//')) { // root URL
            return false;
        }
        else if (url.startsWith('/')) {
            return true;
        } else {
            return true; // to check again
        }
    }
}

var c = new Crawler({
    encoding: null,
    maxConnections: 10,

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
                //a lean implementation of core jQuery designed specifically for the server
                console.log($("title").text());

                var scripts = $("script");
                scripts.each(function (i, script) {
                    var src = $(script).attr("src");
                    if (src) {
                        console.log("script:" + i + "-" + src + " (len=" + src.length + ")");

                        var resFilename = GetResourceFilename(src);
                        // update src
                        $(script).attr("src", resFilename);

                        c.queue(
                            {
                                url: src.startsWith("//") ? "https:" + src : src,
                                filename: resFilename,
                                adjustHtml: false
                            }
                        );
                    }
                });

                var images = $("img");
                images.each(function (i, image) {
                    var src = $(image).attr("src");
                    if (src) {
                        console.log("image:" + i + "-" + src + " (len=" + src.length + ")");

                        var resFilename = GetResourceFilename(src);
                        // update src
                        $(image).attr("src", resFilename);

                        c.queue(
                            {
                                url: src.startsWith("//") ? "https:" + src : src,
                                filename: resFilename,
                                adjustHtml: false
                            }
                        );
                    }
                });

                var links = $("a");
                links.each(function (i, link) {
                    var href = $(link).attr("href");
                    if (href) {
                        console.log("link:" + i + "-" + href + " (len=" + href.length + ")");

                        if (IsSubUrl(href)) {
                            var ext = path.extname(href);
                            var linkFilename = href;
                            if(!ext || ext===href){
                                linkFilename = href + '.html';
                                $(link).attr("href", linkFilename);
                            }

                            var curUrl = res.request.href;

                            console.log("add SubURL:" + i + "-" + curUrl + " ~ " + href);
                            c.queue(
                                {
                                    url: curUrl + href.substring(1),
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
                    var wstream = fs.createWriteStream(filename, { encoding: 'binary' }) // type BufferEncoding = "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "latin1" | "binary" | "hex";
                    wstream.write(res.body);
                    wstream.end();
                }
            }

        }
        done();
    }
});

// Queue just one URL, with default callback
c.queue(
    {
        url: 'https://www.sedna.com/',
        filename: 'index.html',
        adjustHtml: true
    }
);