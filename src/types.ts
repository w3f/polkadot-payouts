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
    controllerAddress: string;
}

export interface ClaimsThirdParty {
  claimerKeystore: Keystore;
  targets: Array<Target>;
}

export interface Target {
  alias: string;
  validatorAddress: string;
}


export interface AccountantInputConfig {
    transactions: Array<Transaction>;
    claims: Array<Claim>;
    claimsThirdParty?: ClaimsThirdParty;
    minimumSenderBalance: number;
    isDeepHistoryCheckForced?: boolean;
    gracePeriod?: GracePeriod;
}

export interface InputConfig extends AccountantInputConfig {
  wsEndpoint: string;
  logLevel: string;
}

export interface GracePeriod {
  enabled: boolean;
  eras: number;
}

export interface ApiClient extends ApiClientW3f {
  claim(controllerKeystore: Keystore, validatorStash: string, isHistoryCheckForced?: boolean, gracePeriod?: GracePeriod): Promise<void>;
  claimForValidator(validatorAddress: string, claimerKeystore: Keystore, isHistoryCheckForced?: boolean, gracePeriod?: GracePeriod): Promise<void>;
}


