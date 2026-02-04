'use strict';

class StateManager {
    constructor(adapter, Keys) {
        this.adapter = adapter;
        this.Keys = Keys;
    }

    async createAllObjects() {
        const commandValues = [];
        let channel;

        for (const key in this.Keys) {
            if (this.Keys[key] === null) {
                channel = key;
                await this._create(channel, '', 'channel');
            } else {
                commandValues.push(key);
                await this._create(`${channel}.${this.Keys[key]}`, key, 'state');
            }
        }

        await this._create('Power.checkOn', '', 'state');
        await this._create('Power.off', false, 'state');
        await this._create('Power.on', false, 'state');

        await this._create('command', '', 'state', 'state', {
            type: 'string',
            values: commandValues,
            states: commandValues
        });

        await this._create('Power.checkOnOff', '', 'state');

        await this._create('info.connected', false, 'state', 'indicator.connected');

        this.adapter.subscribeStates('*');
    }

    async _create(id, def, type, role = 'state', commonOverride = null) {
        const common = commonOverride || {
            name: id,
            type: typeof def,
            role,
            def,
            read: true,
            write: true
        };

        await this.adapter.setObjectNotExistsAsync(id, {
            type,
            common,
            native: {}
        });

        await this.adapter.setStateAsync(id, def, true);
    }

    handleStateChange(id, state) {
        if (!state || state.ack) return;
        this.adapter.log.debug(`State change: ${id} = ${state.val}`);
    }
}

module.exports = StateManager;
