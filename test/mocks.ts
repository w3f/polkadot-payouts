import { Keystore } from '../src/types';

export class LoggerMock {
    info(msg: string) {
    }
}

export class ClientMock {
    send(keystore: Keystore, recipentAddress: string, amount: number) {
    }

    claim() {

    }
}
