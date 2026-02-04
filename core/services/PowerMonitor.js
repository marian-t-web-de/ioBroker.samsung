'use strict';

const PingService = require('./PingService');

class PowerMonitor {
    constructor(adapter, remoteWrapper) {
        this.adapter = adapter;
        this.remoteWrapper = remoteWrapper;

        this.timer = null;
        this.lastOn = undefined;
        this.interval = 15000;
    }

    start() {
        this.adapter.log.debug('PowerMonitor: starting...');
        this._loop();
    }

    stop() {
        if (this.timer) clearTimeout(this.timer);
    }

    async _loop() {
        const on = await PingService.isReachable(this.adapter.config.ip);
        this.adapter.log.debug(`PowerMonitor: on=${on}, last=${this.lastOn}`);

        if (this.lastOn !== on) {
            if (on) {
                this.adapter.setState('Power.checkOnOff', 'ON', true);
                this.adapter.setState('Power.on', true, true);

                if (!this.remoteWrapper.isConnected()) {
                    this.remoteWrapper.triggerReconnect();
                }
            } else {
                this.adapter.setState('Power.checkOnOff', 'OFF', true);
                this.adapter.setState('Power.on', false, true);
                this.adapter.setState('info.connected', false, true);
            }

            this.lastOn = on;
        }

        if (!this.remoteWrapper.isConnected()) {
            this.timer = setTimeout(() => this._loop(), this.interval);
        }
    }
}

module.exports = PowerMonitor;
