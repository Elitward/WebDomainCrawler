var Crawler = require("crawler");
var fs = require('fs');

const UserAgentName = "Eli's Crawler"
const DefaultOutputPath = 'output/'

var c = new Crawler({
    maxConnections : 10,

    userAgent: UserAgentName, // to avoid "400 Bad Request" from SEDNA

    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log($("title").text());

            // var scripts = $("script");
            // if(Array.isArray(scripts)) {
            //     scripts.forEach(script => {
            //         console.log("script", script);
            //     });
            // }
            // if(typeof scripts === 'object'){
            //     for (var key in scripts) {
            //         if (scripts.hasOwnProperty(key)) {
            //           // Do things here
            //           console.log("script", key, scripts[key]);
            //         }
            //     }
            // }

            var scripts = $("script");
            scripts.each(function(i, script) {
                var src = $(script).attr("src");
                console.log("script: " + src);
            });
    


            var filename = DefaultOutputPath + (res.options.filename ? res.options.filename : "index.html");
            fs.createWriteStream(filename).write(res.body);
        }
        done();
    }
});
 
// Queue just one URL, with default callback
c.queue('https://www.sedna.com/');