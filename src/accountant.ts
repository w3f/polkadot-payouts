import winston from 'winston';

import { AccountantConfig, Transaction } from './types';

export class Accountant {
    transactions: Array<Transaction>;
    logger: winston.Logger;

    constructor(cfg: AccountantConfig, logger: winston.Logger) {
        this.transactions = cfg.transactions;
        this.logger = logger;
    }

    async run() { }
}
