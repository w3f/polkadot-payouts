import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Balance } from '@polkadot/types/interfaces'
import { waitReady } from '@polkadot/wasm-crypto';
import fs from 'fs-extra';

import { Logger, Keystore } from './types';
import { ZeroBalance } from './constants';


export class Client {
    private api: ApiPromise;

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

        const keyring = new Keyring({ type: 'sr25519' });
        const keyContents = fs.readFileSync(keystore.filePath, { encoding: 'utf-8' });
        const senderKeyPair = keyring.addFromJson(JSON.parse(keyContents));
        const passwordContents = fs.readFileSync(keystore.passwordPath, { encoding: 'utf-8' });
        senderKeyPair.decodePkcs8(passwordContents);

        await this.api.tx.balances
            .transfer(recipentAddress, amount).signAndSend(senderKeyPair);
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
        this.api.disconnect();
    }

    private async getAccount(addr: string) {
        return this.api.query.system.account(addr);
    }
}
