import { Balance } from '@polkadot/types/interfaces';

export interface Keystore {
    filePath: string;
    passwordPath: string;
}

interface TransactionActor {
    alias: string;
}

interface TransactionSender extends TransactionActor {
    keystore: Keystore;
}

interface TransactionReceiver extends TransactionActor {
    address: string;
}

export type TransactionRestriction = {
    remaining: number;
    desired: number;
}

export interface Transaction {
    sender: TransactionSender;
    receiver: TransactionReceiver;
    restriction: TransactionRestriction;
}

export interface InputConfig {
    transactions: Array<Transaction>;
    wsEndpoint: string;
    logLevel: string;
}

export interface CmdOptions {
    detached?: boolean;
    matcher?: RegExp;
    verbose?: boolean;
    env?: any;
}
