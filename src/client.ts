import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Balance } from '@polkadot/types/interfaces'
import { createType, GenericImmortalEra } from '@polkadot/types';
import { waitReady } from '@polkadot/wasm-crypto';
import fs from 'fs-extra';
import waitUntil from 'async-wait-until';

import { Logger, Keystore } from './types';
import { ZeroBalance } from './constants';


export class Client {
    private api: ApiPromise;
    private currentTxDone: boolean;

    constructor(private readonly wsEndpoint: string, private readonly logger: Logger) { }

    public async balanceOf(addr: string): Promise<Balance> {
        if (!this.api) {
            await this.connect();
        }

        const account = await this.getAccount(addr);
        return account.data.free;
    }

    public async send(keystore: Keystore, recipentAddress: string, amount: Balance): Promise<void> {
        if (amount.lte(ZeroBalance)) {
            return
        }

        if (!this.api) {
            await this.connect();
        }

        const era = createType(
            this.api.registry,
            'ExtrinsicEra',
            new GenericImmortalEra(this.api.registry)
        );

        const keyContents = JSON.parse(fs.readFileSync(keystore.filePath, { encoding: 'utf-8' }));
        const keyType = keyContents.encoding.content[1];
        const keyring = new Keyring({ type: keyType });
        const senderKeyPair = keyring.addFromJson(keyContents);
        const passwordContents = fs.readFileSync(keystore.passwordPath, { encoding: 'utf-8' });
        senderKeyPair.decodePkcs8(passwordContents);

        const account = await this.getAccount(senderKeyPair.address);
        const transfer = this.api.tx.balances.transfer(recipentAddress, amount);
        const transferOptions = {
            blockHash: this.api.genesisHash,
            era,
            nonce: account.nonce
        };
        this.logger.info(`sending ${amount} from ${senderKeyPair.address} to ${recipentAddress}`);
        this.currentTxDone = false;
        try {
            await transfer.signAndSend(
                senderKeyPair,
                transferOptions,
                this.sendStatusCb.bind(this)
            );
        } catch (e) {
            this.logger.info(`Exception during tx sign and send: ${e}`);
        }
        this.logger.info(`after sending ${amount} from ${senderKeyPair.address} to ${recipentAddress}, waiting for transaction done`);

        try {
            await waitUntil(() => this.currentTxDone, 48000, 500);
        } catch (error) {
            this.logger.info(`tx failed: ${error}`);
        }
    }

    private async connect() {
        const provider = new WsProvider(this.wsEndpoint);
        this.api = await ApiPromise.create({ provider });

        const [chain, nodeName, nodeVersion] = await Promise.all([
            this.api.rpc.system.chain(),
            this.api.rpc.system.name(),
            this.api.rpc.system.version()
        ]);

        await waitReady();
        this.logger.info(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
    }

    public disconnect() {
        if (this.api) {
            this.api.disconnect();
        }
    }

    private async getAccount(addr: string) {
        return this.api.query.system.account(addr);
    }

    private async sendStatusCb({ events = [], status }) {
        switch (status.type) {
            case 'Invalid':
                this.logger.info(`Transaction invalid`);
                this.currentTxDone = true;
                break;
            case 'Ready':
                this.logger.info(`Transaction is ready`);
                break;
            case 'Broadcast':
                this.logger.info(`Transaction has been broadcasted`);
                break;
            case 'Finalized':
                this.logger.info(`Transaction has been included in blockHash ${status.asFinalized}`);
                events.forEach(
                    async ({ event: { method } }) => {
                        if (method === 'ExtrinsicSuccess') {
                            this.logger.info(`Transaction succeeded`);
                        } else if (method === 'ExtrinsicFailed') {
                            this.logger.info(`Transaction failed`);
                        }
                    }
                );
                this.currentTxDone = true;
        }
    }
}
