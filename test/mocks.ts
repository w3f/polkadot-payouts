import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

import { Keystore } from '../src/types';

export class LoggerMock {
    info(msg: string) {
    }
}

export class ClientMock {
    send(keystore: Keystore, recipentAddress: string, amount: Balance) {
    }
    async balanceOf(addr: string): Promise<Balance> {
        return new BN(10) as Balance;
    }
    claim() {

    }
}
