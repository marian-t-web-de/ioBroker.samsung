'use strict';

const SamsungHJ = require('../../lib/H-and-J-Series-lib/SamsungTv');
const SamsungTvEvents = require('../../lib/H-and-J-Series-lib/SamsungTvEvents');
const PingService = require('../services/PingService');

class SamsungHJController {
    constructor(adapter, remoteWrapper, powerMonitor) {
        this.adapter = adapter;
        this.remoteWrapper = remoteWrapper;
        this.powerMonitor = powerMonitor;

        this.remoteHJ = null;
        this.connecting = false;
        this.connected = false;
        this.abort = false;
        this.timer = null;
    }

    start() {
        this.adapter.log.info('SamsungHJController: starting...');
        this.init();
    }

    shutdown() {
        this.abort = true;
        if (this.timer) clearTimeout(this.timer);
    }

    async init() {
        if (this.connecting || this.connected) return;

        const reachable = await PingService.isReachable(this.adapter.config.ip);
        if (!reachable) {
            this.adapter.log.debug('SamsungHJ: TV unreachable → skipping connect');
            return;
        }

        this.connecting = true;
        this.abort = false;

        try {
            this.remoteHJ = new SamsungHJ({
                ip: this.adapter.config.ip,
                appId: '721b6fce-4ee6-48ba-8045-955a539edadb',
                userId: '654321'
            });

            this._attachEvents();

            await this.remoteHJ.init2();
            if (this.abort) return;

            if (!this.adapter.config.pin) {
                this.adapter.log.info('SamsungHJ: Requesting PIN on TV');
                this.remoteHJ.requestPin();
                return;
            }

            await this.remoteHJ.confirmPin(this.adapter.config.pin);
            if (this.abort) return;

            await this.remoteHJ.connect();
            if (this.abort) return;

            this.remoteWrapper.setRemote(this.remoteHJ);

            this.connected = true;
            this.adapter.setState('info.connected', true, true);
            this.adapter.log.info('SamsungHJ: Connected');

        } catch (err) {
            this.adapter.log.warn(`SamsungHJ: Connection failed: ${err.message}`);
            this.connected = false;
            this.adapter.setState('info.connected', false, true);

            this.timer = setTimeout(() => this.init(), 8000);
        } finally {
            this.connecting = false;
        }
    }

    _attachEvents() {
        this.remoteHJ.eventEmitter.on(SamsungTvEvents.CONNECTING, () => {
            this.adapter.log.debug('SamsungHJ: Websocket CONNECTING');
            this.connected = true;
            this.adapter.setState('info.connected', true, true);
        });

        this.remoteHJ.eventEmitter.on(SamsungTvEvents.DISCONNECTED, () => {
            this.adapter.log.warn('SamsungHJ: Websocket DISCONNECTED');
            this.connected = false;
            this.adapter.setState('info.connected', false, true);

            this.abort = true;

            this.timer = setTimeout(() => this.init(), 5000);
        });
    }
}

module.exports = SamsungHJController;
