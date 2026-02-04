'use strict';

const SamsungTV = require('../lib/samsungtv/build/device.js');
const PingService = require('./PingService');

class SamsungTVController {
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
        this.adapter.log.info('SamsungTVController: starting...');
        this._connect();
    }

    async _connect() {
        if (this.connecting || this.connected) return;

        const reachable = await PingService.isReachable(this.adapter.config.ip);
        if (!reachable) {
            this.adapter.log.debug('SamsungTV: TV unreachable → skipping connect');
            return;
        }

        this.connecting = true;

        try {
            this.remote = new SamsungTV(this.adapter.config.ip, this.adapter.config.mac);

            if (this.adapter.config.token) {
                this.remote.token = this.adapter.config.token;
            }

            await this.remote.connect('ioBroker');

            this.remoteWrapper.setRemote({
                sendKey: async key => {
                    await this.remote.connect('ioBroker');
                    await this.remote.sendKey(key);
                }
            });

            this.connected = true;
            this.adapter.setState('info.connected', true, true);
            this.adapter.log.info('SamsungTV: Connected');

        } catch (err) {
            this.adapter.log.warn(`SamsungTV: Connection failed: ${err.message}`);
            this.connected = false;
            this.adapter.setState('info.connected', false, true);

            this.timer = setTimeout(() => this._connect(), 8000);
        } finally {
            this.connecting = false;
        }
    }
}

module.exports = SamsungTVController;
