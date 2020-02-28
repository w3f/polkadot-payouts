interface Keystore {
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

type TransactionRestriction = RemainingTransactionRestriction | DesiredTransactionRestriction

export interface Transaction {
    sender: TransactionSender,
    receiver: TransactionActor,
    restriction: TransactionRestriction
}


export interface AccountantConfig {
    wsEndpoint: string,
    transactions: Array<Transaction>,
};

export interface InputConfig {
    accountant: AccountantConfig,
    logLevel: string
}
