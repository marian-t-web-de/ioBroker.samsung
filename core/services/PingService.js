'use strict';

const ping = require('../lib/ping');

class PingService {
    static isReachable(ip) {
        return new Promise(res => {
            ping.probe(ip, { timeout: 2000 }, (err, r) => {
                res(!err && r && r.alive);
            });
        });
    }
}

module.exports = PingService;
