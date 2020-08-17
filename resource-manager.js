var path = require("path");
var md5 = require('md5');

const Resources = [];

const HashUrl = (url, extension) => {
    if (!extension) { // if extension is not specified, try to get extension from URL
        extension = path.extname(url);
    }

    var urlMd5 = md5(url);
    var hash = urlMd5 + extension;
    return hash;
}

const ResourceManager = {
    addResource: (url, extension) => {
        var existing = Resources[url];
        if (existing) {
            return existing;
        } else {
            var hash = HashUrl(url, extension);
            Resources[url] = hash;
            return hash;
        }
    },

    getResource: (url) => { // return the MD5 of that resource
        var existing = Resources[url];
        return existing ? existing : null;
    }
}

module.exports = ResourceManager;
