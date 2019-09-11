import async from 'async';
const { __ } = require('embark-i18n');

import BlockchainAPI from "./api";
class Blockchain {

  constructor(embark) {
    this.embarkConfig = embark.config.embarkConfig;
    this.logger = embark.logger;
    this.events = embark.events;
    this.blockchainConfig = embark.config.blockchainConfig;
    this.contractConfig = embark.config.contractConfig;
    this.blockchainApi = new BlockchainAPI(embark);


    embark.registerActionForEvent("pipeline:generateAll:before", this.addArtifactFile.bind(this));

    this.blockchainNodes = {};
    this.events.setCommandHandler("blockchain:node:register", (clientName, isStarted = () => false, start) => {
      this.blockchainNodes[clientName] = { isStarted, start };
    });

    this.events.setCommandHandler("blockchain:node:start", (blockchainConfig, cb) => {

      const clientName = blockchainConfig.client;
      const client = this.blockchainNodes[clientName];

      if (!client) return cb(`Blockchain client ${clientName} not found, please register this node using 'blockchain:node:register'.`);

      // check if we should should start
      client.isStarted.call(client, (err, isStarted) => {
        if (err) {
          return cb(err);
        }
        if (isStarted) {
          // Node may already be started
          this.events.emit("blockchain:started");
          return cb(null, true);
        }
        // start node
        client.start.call(client, () => {
          this.events.emit("blockchain:started", clientName);
          cb();
        });
      });
    });
    this.blockchainApi.registerAPIs("ethereum");
    this.blockchainApi.registerRequests("ethereum");
  }

  addArtifactFile(_params, cb) {
    this.events.request("config:contractsConfig", (_err, contractsConfig) => {
      async.map(contractsConfig.dappConnection, (conn, mapCb) => {
        if (conn === '$EMBARK') {
          // Connect to Embark's endpoint (proxy)
          return this.events.request("proxy:endpoint:get", mapCb);
        }
        mapCb(null, conn);
      }, (err, results) => {
        if (err) {
          this.logger.error(__('Error getting dapp connection'));
          return cb(err);
        }
        let config = {
          provider: contractsConfig.library || 'web3',
          dappConnection: results,
          dappAutoEnable: contractsConfig.dappAutoEnable,
          warnIfMetamask: this.blockchainConfig.isDev,
          blockchainClient: this.blockchainConfig.client
        };

        this.events.request("pipeline:register", {
          path: [this.embarkConfig.generationDir, 'config'],
          file: 'blockchain.json',
          format: 'json',
          content: config
        }, cb);
      });
    });
  }

}

module.exports = Blockchain;
