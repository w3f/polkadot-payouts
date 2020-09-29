export interface Keystore {
    filePath: string;
    passwordPath: string;
}

interface BaseActor {
    alias: string;
}

interface CommonActor extends BaseActor {
    keystore: Keystore;
}

interface TransactionSender extends CommonActor { }

interface TransactionReceiver extends BaseActor {
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

export interface Claim extends CommonActor {
    controllerAddress: string;
}

export interface InputConfig {
    transactions: Array<Transaction>;
    claims: Array<Claim>;
    wsEndpoint: string;
    logLevel: string;
    minimumSenderBalance: number;
}

export interface CmdOptions {
    detached?: boolean;
    matcher?: RegExp;
    verbose?: boolean;
    env?: any;
}
