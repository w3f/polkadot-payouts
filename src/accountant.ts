import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

import {
    Client,
    Logger,
    Transaction,
    TransactionRestriction
} from './types';
import { ZeroBalance, MinimumSenderBalance } from './constants';

export class Accountant {

    constructor(
        private readonly transactions: Array<Transaction>,
        private readonly client: Client,
        private readonly logger: Logger) { }

    async run() {
        if (this.transactions.length > 0) {
            for (let i = 0; i < this.transactions.length; i++) {
                this.logger.info(`tx ${i} from ${this.transactions[i].sender.alias} to ${this.transactions[i].receiver.alias}`);
                await this.processTx(this.transactions[i]);
            }
        }
        this.client.disconnect();
    }

    private async processTx(tx: Transaction) {
        const amount = await this.determineAmount(tx.restriction, tx.sender.address, tx.receiver.address);

        return this.client.send(tx.sender.keystore, tx.receiver.address, amount);
    }

    private async determineAmount(restriction: TransactionRestriction, senderAddr: string, receiverAddr: string): Promise<Balance> {
        if (restriction.desired &&
            restriction.desired >= 0 &&
            restriction.remaining &&
            restriction.remaining >= 0) {
            this.logger.info(`desired (${restriction.desired}) and remaining (${restriction.remaining}) specified at the same time, not sending`);
            return ZeroBalance;
        }

        const senderBalance: Balance = await this.client.balanceOf(senderAddr);
        if (senderBalance.lt(MinimumSenderBalance)) {
            this.logger.info(`sender ${senderAddr} doesn't have enough funds: ${senderBalance}`);
            return ZeroBalance;
        }
        const remainingBalance = new BN(restriction.remaining) as Balance;
        if (senderBalance.lte(remainingBalance)) {
            this.logger.info(`sender ${senderAddr} doesn't have enough funds to leave ${remainingBalance} after the transaction: ${senderBalance}`);
            return ZeroBalance;
        }

        const receiverBalance: Balance = await this.client.balanceOf(receiverAddr);

        const remaining = restriction.remaining;
        if ((remaining === 0 || !remaining) &&
            restriction.desired &&
            restriction.desired != 0) {
            const desired = new BN(restriction.desired);
            if (receiverBalance.gte(desired)) {
                this.logger.info(`no need to send anything, receiver balance ${receiverBalance} >= ${desired}`);
                return ZeroBalance;
            }
            const ideal = desired.sub(receiverBalance) as Balance;
            const availableSend = senderBalance.sub(MinimumSenderBalance) as Balance;
            if (ideal.gt(availableSend)) {
                this.logger.info(`best effort, not enough funds in sender, sending ${availableSend}`);
                return availableSend;
            }
            //ideal
            return ideal;
        }

        if (remainingBalance.lt(MinimumSenderBalance)) {
            this.logger.info(`restriction.remaining is <1 (${remaining})`);
            return ZeroBalance;
        }
        const remainingBN = new BN(remaining);

        return senderBalance.sub(remainingBN) as Balance;
    }
}
