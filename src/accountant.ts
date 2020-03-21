import {
    Client,
    Logger,
    Transaction,
    TransactionRestriction,
    ValidatorRewardClaim
} from './types';

import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

export class Accountant {
    constructor(
        private transactions: Array<Transaction>,
        private validatorRewardClaims: Array<ValidatorRewardClaim>,
        private client: Client,
        private logger: Logger) { }

    async run() {
        if (this.transactions.length > 0) {
            for (let i = 0; i < this.transactions.length; i++) {
                await this.processTx(this.transactions[i]);
            }
        }
        if (this.validatorRewardClaims.length > 0) {
            for (let i = 0; i < this.validatorRewardClaims.length; i++) {
                await this.processValidatorRewardClaim(this.validatorRewardClaims[i]);
            }
        }
    }

    private async processTx(tx: Transaction) {
        const amount = await this.determineAmount(tx.restriction, tx.sender.address, tx.receiver.address);

        return this.client.send(tx.sender.keystore, tx.receiver.address, amount);
    }

    private async processValidatorRewardClaim(claim: ValidatorRewardClaim) {
        return this.client.claim(claim.keystore);
    }

    private async determineAmount(restriction: TransactionRestriction, senderAddr: string, receiverAddr: string): Promise<Balance> {
        const senderBalance = await this.client.balanceOf(senderAddr);

        const remainingBN = new BN(restriction.remaining);

        return senderBalance.sub(remainingBN) as Balance;
    }
}
