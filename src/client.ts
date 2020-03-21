import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { createType, GenericImmortalEra } from '@polkadot/types';
import { Balance } from '@polkadot/types/interfaces'
import { decodeAddress } from '@polkadot/util-crypto';
import { bufferToU8a } from '@polkadot/util';
import bs58 from 'bs58';
import { waitReady } from '@polkadot/wasm-crypto';

import { Logger } from './types';

export class Client {
    api: ApiPromise;
    logger: Logger;

    constructor(wsEndpoint: string, logger: Logger) {
        this.initApi(wsEndpoint);
        this.logger = logger;
    }

    public async balanceOf(addr: string): Promise<Balance> {
        const account = await this.api.query.system.account(addr);
        return account.data.free;
    }

    private async initApi(wsEndpoint: string) {
        const provider = new WsProvider(wsEndpoint);
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
}
