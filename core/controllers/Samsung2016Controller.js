'use strict';

const Samsung2016 = require('../lib/samsung-2016');
const PingService = require('./PingService');

class Samsung2016Controller {
    constructor(adapter, remoteWrapper, powerMonitor) {
        this.adapter = adapter;
        this.remoteWrapper = remoteWrapper;
        this.powerMonitor = powerMonitor;

        this.remote = null;
        this.connecting = false;
        this.connected = false;
        this.timer = null;
    }

    shutdown() {
        if (this.timer) clearTimeout(this.timer);
    }

    start() {
        this.adapter.log.info('Samsung2016Controller: starting...');
        this._connect();
    }

    async _connect() {
        if (this.connecting || this.connected) return;

        const reachable = await PingService.isReachable(this.adapter.config.ip);
        if (!reachable) {
            this.adapter.log.debug('Samsung2016: TV unreachable → skipping connect');
            return;
        }

        this.connecting = true;

        try {
            this.remote = new Samsung2016({ ip: this.adapter.config.ip, timeout: 2000 });

            this.remote.onError = err => {
                this.adapter.log.warn(`Samsung2016 error: ${err}`);
            };

            await new Promise(res => this.remote.send(undefined, () => res()));

            this.remoteWrapper.setRemote({
                sendKey: key => this.remote.send(key)
            });

            this.connected = true;
            this.adapter.setState('info.connected', true, true);
            this.adapter.log.info('Samsung2016: Connected');

        } catch (err) {
            this.adapter.log.warn(`Samsung2016: Connection failed: ${err.message}`);
            this.connected = false;
            this.adapter.setState('info.connected', false, true);

            this.timer = setTimeout(() => this._connect(), 8000);
        } finally {
            this.connecting = false;
        }
    }
}

module.exports = Samsung2016Controller;
