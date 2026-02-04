'use strict';

const utils = require('@iobroker/adapter-core');
const Keys = require('./keys');

const SamsungHJController = require('./core/controllers/SamsungHJController');
const Samsung2016Controller = require('./core/controllers/Samsung2016Controller');
const SamsungTVController = require('./core/controllers/SamsungTVController');
const SamsungLegacyController = require('./core/controllers/SamsungLegacyController');

const PowerMonitor = require('./core/services/PowerMonitor');
const StateManager = require('./core/services/StateManager');
const RemoteWrapper = require('./core/services/RemoteWrapper');

let adapter;
let controller;
let powerMonitor;
let stateManager;
let remoteWrapper;

function startAdapter() {
    adapter = utils.Adapter({
        name: 'samsung',

        unload: callback => {
            try {
                if (powerMonitor) powerMonitor.stop();
                if (controller) controller.shutdown();
                callback();
            } catch (e) {
                callback();
            }
        },

        stateChange: (id, state) => {
            if (!state || state.ack) return;
            stateManager.handleStateChange(id, state);
        },

        ready: () => main()
    });

    return adapter;
}

async function main() {
    stateManager = new StateManager(adapter, Keys);
    remoteWrapper = new RemoteWrapper(adapter);
    powerMonitor = new PowerMonitor(adapter, remoteWrapper);

    await stateManager.createAllObjects();
    powerMonitor.start();

    switch (adapter.config.apiType) {
        case 'SamsungHJ':
            controller = new SamsungHJController(adapter, remoteWrapper, powerMonitor);
            break;

        case 'Samsung2016':
            controller = new Samsung2016Controller(adapter, remoteWrapper, powerMonitor);
            break;

        case 'SamsungTV':
            controller = new SamsungTVController(adapter, remoteWrapper, powerMonitor);
            break;

        default:
            controller = new SamsungLegacyController(adapter, remoteWrapper, powerMonitor);
            break;
    }

    controller.start();
}

module.exports = startAdapter();
