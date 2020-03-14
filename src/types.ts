export interface Keystore {
    fileSecret: string,
    passwordSecret: string
}

interface TransactionActor {
    alias: string,
    address: string
}

interface TransactionSender extends TransactionActor {
    keystore: Keystore
}

interface RemainingTransactionRestriction {
    remaining: number
}

interface DesiredTransactionRestriction {
    desired: number
}

export type TransactionRestriction = RemainingTransactionRestriction | DesiredTransactionRestriction

export interface Transaction {
    sender: TransactionSender,
    receiver: TransactionActor,
    restriction: TransactionRestriction
}

export interface ValidatorRewardClaim {
    keystore: Keystore
}

export interface InputConfig {
    transactions: Array<Transaction>,
    validatorRewardClaims: Array<ValidatorRewardClaim>,
    wsEndpoint: string,
    logLevel: string
}

export interface Logger {
    info: (msg: string) => void;
}

export interface Client {
    send: (keystore: Keystore, recipentAddress: string, amount: number) => void
    claim: (keystore: Keystore) => void
}
