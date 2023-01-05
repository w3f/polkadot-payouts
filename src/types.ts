import {
  ApiClient as ApiClientW3f,
} from '@w3f/polkadot-api-client';

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
}

export interface ClaimThirdParty {
  claimerKeystore: Keystore;
  parallelExecution?: ParallelExecution;
  targets: Array<Target>;
}

export interface ParallelExecution {
  enabled: boolean;
  degree: number;
}

export interface Target {
  alias: string;
  validatorAddress: string;
}


export interface AccountantInputConfig {
    transactions?: Array<Transaction>;
    claims?: Array<Claim>;
    claimThirdParty?: ClaimThirdParty;
    claimsCheckOnly?: Array<Target>;
    minimumSenderBalance?: number;
    isDeepHistoryCheckForced?: boolean;
    gracePeriod?: GracePeriod;
    retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  delayMillis: number;
  maxAttempts: number;
}

export interface InputConfig extends AccountantInputConfig {
  wsEndpoint: string;
  logLevel: string;
  format: string;
}

export interface GracePeriod {
  enabled: boolean;
  eras: number;
}

export interface ApiClient extends ApiClientW3f {
  claim(validatorKeystore: Keystore, isHistoryCheckForced?: boolean, gracePeriod?: GracePeriod): Promise<void>;
  claimForValidator(validatorAddress: string, claimerKeystore: Keystore, isHistoryCheckForced?: boolean, gracePeriod?: GracePeriod): Promise<void>;
  checkOnly(validatorAddress: string): Promise<number[]>;
}


