import {
    Client,
    Logger,
    Transaction,
    TransactionRestriction,
    ValidatorRewardClaim
} from './types';

export class Accountant {
    transactions: Array<Transaction>;
    validatorRewardClaims: Array<ValidatorRewardClaim>;
    logger: Logger;
    client: Client;

    constructor(transactions: Array<Transaction>, validatorRewardClaims: Array<ValidatorRewardClaim>, client: Client, logger: Logger) {
        this.transactions = transactions;
        this.validatorRewardClaims = validatorRewardClaims;
        this.logger = logger;
        this.client = client;
    }

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
        const amount = this.determineAmount(tx.restriction);
        return this.client.send(tx.sender.keystore, tx.receiver.address, amount);
    }

    private async processValidatorRewardClaim(claim: ValidatorRewardClaim) {
        return this.client.claim(claim.keystore);
    }

    private determineAmount(restriction: TransactionRestriction): number {
        return 0;
    }
}
