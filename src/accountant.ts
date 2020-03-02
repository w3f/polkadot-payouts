import winston from 'winston';

import { Client } from './client';
import { Transaction } from './types';

export class Accountant {
    transactions: Array<Transaction>;
    logger: winston.Logger;
    client: Client;

    constructor(transactions: Array<Transaction>, client: Client, logger: winston.Logger) {
        this.transactions = transactions;
        this.logger = logger;
        this.client = client;
    }

    async run() {
        if (this.transactions.length > 0) {
            for (let i = 0; i < this.transactions.length; i++) {
                await this.processTx(this.transactions[i]);
            }
        }
    }

    private async processTx(tx: Transaction) {

    }
}
