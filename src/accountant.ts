import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { createType, GenericImmortalEra } from '@polkadot/types';
import { decodeAddress } from '@polkadot/util-crypto';
import { bufferToU8a } from '@polkadot/util';
import bs58 from 'bs58';
import { waitReady } from '@polkadot/wasm-crypto';


import winston from 'winston';

import { AccountantConfig, Transaction } from './types';

export class Accountant {
    transactions: Array<Transaction>;
    logger: winston.Logger;
    wsEndpoint: string;
    api: ApiPromise;

    constructor(cfg: AccountantConfig, logger: winston.Logger) {
        this.transactions = cfg.transactions;
        this.wsEndpoint = cfg.wsEndpoint;
        this.logger = logger;
    }

    async run() {
        if (this.transactions.length > 0) {
            await this.initApi();

            for (let i = 0; i < this.transactions.length; i++) {
                await this.processTx(this.transactions[i]);
            }
            this.teardownApi();
        }
    }

    private async initApi() {
        const provider = new WsProvider(this.wsEndpoint);
        this.api = await ApiPromise.create({ provider });

        const [chain, nodeName, nodeVersion] = await Promise.all([
            this.api.rpc.system.chain(),
            this.api.rpc.system.name(),
            this.api.rpc.system.version()
        ])
        this.logger.info(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
    }

    private teardownApi() {
        this.api.disconnect();
    }

    private async processTx(tx: Transaction) {

    }
}
