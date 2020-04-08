import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';
import { Logger } from '@w3f/logger';
import {
    ApiClient,
    Keystore,
    ZeroBalance,
    MinimumSenderBalance
} from '@w3f/polkadot-api-client';

import {
    Transaction,
    TransactionRestriction
} from './types';

export class Accountant {

    constructor(
        private readonly transactions: Array<Transaction>,
        private readonly client: ApiClient,
        private readonly logger: Logger) { }

    async run(): Promise<void> {
        if (this.transactions.length > 0) {
            for (let i = 0; i < this.transactions.length; i++) {
                this.logger.info(`tx ${i} from ${this.transactions[i].sender.alias} to ${this.transactions[i].receiver.alias}`);
                await this.processTx(this.transactions[i]);
            }
        }
        this.client.disconnect();
    }

    private async processTx(tx: Transaction): Promise<void> {
        if (!tx.receiver.address) {
            this.logger.info(`Empty receiver address for '${tx.receiver.alias}', not sending.`);
            return
        }

        const amount = await this.determineAmount(tx.restriction, tx.sender.keystore, tx.receiver.address);

        return this.client.send(tx.sender.keystore, tx.receiver.address, amount);
    }

    private async determineAmount(restriction: TransactionRestriction, senderKeystore: Keystore, receiverAddr: string): Promise<Balance> {
        if (restriction.desired &&
            restriction.desired >= 0 &&
            restriction.remaining &&
            restriction.remaining >= 0) {
            this.logger.info(`desired (${restriction.desired}) and remaining (${restriction.remaining}) specified at the same time, not sending`);
            return ZeroBalance;
        }

        const senderBalance: Balance = await this.client.balanceOfKeystore(senderKeystore);
        if (senderBalance.lt(MinimumSenderBalance)) {
            this.logger.info(`sender doesn't have enough funds: ${senderBalance}`);
            return ZeroBalance;
        }
        const remainingBalance = new BN(restriction.remaining) as Balance;
        if (senderBalance.lte(remainingBalance)) {
            this.logger.info(`sender doesn't have enough funds to leave ${remainingBalance} after the transaction: ${senderBalance}`);
            return ZeroBalance;
        }

        const receiverBalance: Balance = await this.client.balanceOf(receiverAddr);

        if (remainingBalance.eq(ZeroBalance) &&
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
            this.logger.info(`restriction.remaining is < ${MinimumSenderBalance} (${remainingBalance})`);
            return ZeroBalance;
        }
        return senderBalance.sub(remainingBalance) as Balance;
    }
}
