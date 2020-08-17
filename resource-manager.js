const path = require("path");
const md5 = require('md5');

const Resources = [];

const HashUrl = (url, extension) => {
    if (!extension) { // if extension is not specified, try to get extension from URL
        extension = path.extname(url);
    }

    let urlMd5 = md5(url);
    let hash = urlMd5 + extension;
    return hash;
}

const ResourceManager = {
    addResource: (url, extension) => {
        let existing = Resources[url];
        if (existing) {
            return existing;
        } else {
            let hash = HashUrl(url, extension);
            Resources[url] = hash;
            return hash;
        }
    },

    getResource: (url) => { // return the MD5 of that resource
        let existing = Resources[url];
        return existing ? existing : null;
    }
}

module.exports = ResourceManager;
