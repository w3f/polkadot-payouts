import { ApiPromise, Keystore, Balance } from '@w3f/polkadot-api-client';
import BN from 'bn.js';


export class ClientMock {
    async send(keystore: Keystore, recipentAddress: string, amount: Balance): Promise<void> {
    }
    async balanceOf(addr: string): Promise<Balance> {
        return new BN(10) as Balance;
    }
    async balanceOfKeystore(keystore: Keystore): Promise<Balance> {
        return new BN(10) as Balance;
    }
    async api(): Promise<ApiPromise> {
        return;
    }
    disconnect(): void { }
    async claim(validatorKeystore: Keystore): Promise<void> {
    }
    async claimForValidator(validatorAddress: string, claimerKeystore: Keystore): Promise<void> {
    }
    async checkOnly(validatorAddress: string): Promise<number[]> {
      return []
    }
}
