'use strict';

const SamsungRemote = require('samsung-remote');
const PingService = require('./PingService');

class SamsungLegacyController {
    constructor(adapter, remoteWrapper, powerMonitor) {
        this.adapter = adapter;
        this.remoteWrapper = remoteWrapper;
        this.powerMonitor = powerMonitor;

        this.remote = null;
        this.connected = false;
        this.timer = null;
    }

    shutdown() {
        if (this.timer) clearTimeout(this.timer);
    }

    start() {
        this.adapter.log.info('SamsungLegacyController: starting...');
        this._connect();
    }

    async _connect() {
        const reachable = await PingService.isReachable(this.adapter.config.ip);
        if (!reachable) {
            this.adapter.log.debug('Legacy: TV unreachable → skipping connect');
            return;
        }

        try {
            this.remote = new SamsungRemote({ ip: this.adapter.config.ip });

            this.remoteWrapper.setRemote({
                sendKey: key => this.remote.send(key)
            });

            this.connected = true;
            this.adapter.setState('info.connected', true, true);
            this.adapter.log.info('Legacy SamsungRemote: Connected');

        } catch (err) {
            this.adapter.log.warn(`Legacy SamsungRemote: Connection failed: ${err.message}`);
            this.connected = false;
            this.adapter.setState('info.connected', false, true);

            this.timer = setTimeout(() => this._connect(), 8000);
        }
    }
}

module.exports = SamsungLegacyController;
