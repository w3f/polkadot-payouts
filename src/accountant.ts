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
    private readonly zeroBalance = new BN(0) as Balance;
    private readonly minimumSenderBalance = new BN(1) as Balance;

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
        const senderBalance: Balance = await this.client.balanceOf(senderAddr);
        if (senderBalance.lt(this.minimumSenderBalance)) {
            // sender doesn't have enough funds
            return new BN(0) as Balance;
        }

        const receiverBalance: Balance = await this.client.balanceOf(receiverAddr);
        const remaining = restriction.remaining;
        if (remaining == 0 && restriction.desired != 0) {
            const desired = new BN(restriction.desired);
            if (receiverBalance.gte(desired)) {
                // no need to send anything, receiver already has >= desired
                return this.zeroBalance;
            }
            const ideal = desired.sub(receiverBalance) as Balance;
            const availableSend = senderBalance.sub(this.minimumSenderBalance) as Balance;
            if (ideal.gt(availableSend)) {
                // best effort
                return availableSend;
            }
            //ideal
            return ideal;
        }
        if (remaining < 1) {
            return this.zeroBalance;
        }
        const remainingBN = new BN(remaining);

        return senderBalance.sub(remainingBN) as Balance;
    }
}
