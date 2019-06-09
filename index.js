const HTMLParser = require('node-html-parser');
const cloudscraper = require('cloudscraper');

var Torrent9Api = function(url) {
    this.url = url;
};

class Torrent9 {
    title = "";
    seed = 0;
    leech = 0;
    magnetUrl = "";
    torrentUrl = "";
    size = "";
}

Torrent9Api.prototype.findByName = function(name) {
    return new Promise((resolve) => {
        let torrents = [];

        name = name.replace(/ /gi, '%20');

        const searchTorrents = urlSearch => new Promise(resolve => {
            cloudscraper.get(urlSearch).then((resp) => {
                var root = HTMLParser.parse(resp);
                let selector = root.querySelectorAll('div.table-responsive table tr');

                let promises = [];
                selector.forEach((child) => {
                    let rawAttrs = child.childNodes[1].childNodes[2].rawAttrs;
                    let split = rawAttrs.split('href="');
                    let url = split[1].substring(0, split[1].indexOf('"'));
                    promises.push(cloudscraper.get(this.url + url));
                });

                return Promise.all(promises);
            }).then((results) => {
                results.forEach((resp) => {
                    let torrent = new Torrent9();
                    var root = HTMLParser.parse(resp);
                    let selectors = root.querySelectorAll('a.btn.btn-danger.download');
                    selectors.forEach((selector) => {
                        let rawAttrs = selector.rawAttrs;
                        let split = rawAttrs.split('href=\'');
                        let url = split[1].substring(0, split[1].indexOf('\''));
                        if (selector.childNodes[1].rawText === " Télécharger le Torrent") {
                            torrent.torrentUrl = this.url + url;
                        }
                        if (selector.childNodes[1].rawText === " Lien Magnet") {
                            torrent.magnetUrl = this.url + url;
                        }
                    });
                    let selector = root.querySelector('h5.pull-left');
                    torrent.title = selector.rawText.replace(/&nbsp;/g, " ").trim();
                    torrent.seed = parseInt(root.querySelectorAll('div.movie-information ul li')[2].rawText.trim());
                    torrent.leech = parseInt(root.querySelectorAll('div.movie-information ul li')[6].rawText.trim());
                    torrent.size = root.querySelectorAll('div.movie-information ul li')[9].rawText.trim();
                    torrents.push(torrent);
                });
                resolve();
            });
        });

        (async function loop(url, name) {
            let count = 0;
            do {
                count = torrents.length;
                let urlSearch = url + "/recherche/" + name + "/" + (count + 1);
                await searchTorrents(urlSearch);
            } while (torrents.length !== count && torrents.length % 50 === 0);
            resolve(torrents);
        })(this.url, name);
    });
};
module.exports = Torrent9Api;