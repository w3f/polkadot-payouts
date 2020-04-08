import { Balance } from '@polkadot/types/interfaces';
import { Keystore } from '@w3f/polkadot-api-client';
import BN from 'bn.js';


export class LoggerMock {
    info(msg: string): void {
    }
    debug(msg: string): void {
    }
}

export class ClientMock {
    async send(keystore: Keystore, recipentAddress: string, amount: Balance): Promise<void> {
    }
    async balanceOf(addr: string): Promise<Balance> {
        return new BN(10) as Balance;
    }
    async balanceOfKeystore(keystore: Keystore): Promise<Balance> {
        return new BN(10) as Balance;
    }
    async connect(): Promise<void> { }
    disconnect(): void { }
}
