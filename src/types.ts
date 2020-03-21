import { Balance } from '@polkadot/types/interfaces';

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

export type TransactionRestriction = {
    remaining: number,
    desired: number
}

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
    send: (keystore: Keystore, recipentAddress: string, amount: Balance) => void
    balanceOf: (addr: string) => Promise<Balance>
    claim: (keystore: Keystore) => void
}
