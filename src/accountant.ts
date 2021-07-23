import BN from 'bn.js';
import { Logger } from '@w3f/logger';
import {
    Keystore,
    ZeroBalance,
    Balance
} from '@w3f/polkadot-api-client';

import {
    Transaction,
    TransactionRestriction,
    Claim,
    ApiClient, AccountantInputConfig, ClaimsThirdParty, Target, GracePeriod
} from './types';

export class Accountant {
    private minimumSenderBalance: Balance;
    private isDeepHistoryCheckForced = false;
    private gracePeriod: GracePeriod = {enabled: false, eras: 0};
    private transactions: Array<Transaction> = [];
    private claims: Array<Claim> = [];
    private claimsThirdParty: ClaimsThirdParty;

    constructor(
        cfg: AccountantInputConfig,
        private readonly client: ApiClient,
        private readonly logger: Logger) {
        this.minimumSenderBalance = new BN(cfg.minimumSenderBalance) as Balance
        if(cfg.transactions) this.transactions = cfg.transactions
        if(cfg.claims) this.claims = cfg.claims    
        if(cfg.claimsThirdParty) this.claimsThirdParty = cfg.claimsThirdParty
        if(cfg.isDeepHistoryCheckForced) this.isDeepHistoryCheckForced = cfg.isDeepHistoryCheckForced
        if(cfg.gracePeriod) this.gracePeriod = cfg.gracePeriod
    }

    async run(): Promise<void> {
        if (this.claims.length > 0) {
            for (let i = 0; i < this.claims.length; i++) {
                this.logger.info(`Processing claim ${i} for ${this.claims[i].alias}`);
                await this.processClaim(this.claims[i]);
            }
        }
        if (this.claimsThirdParty?.targets.length > 0) {
          for (let i = 0; i < this.claimsThirdParty.targets.length; i++) {
              this.logger.info(`Processing third party claim ${i} for ${this.claimsThirdParty.targets[i].alias}`);
              await this.processClaimThirdParty(this.claimsThirdParty.claimerKeystore,this.claimsThirdParty.targets[i]);
          }
        } 
        if (this.transactions.length > 0) {
            for (let i = 0; i < this.transactions.length; i++) {
                this.logger.info(`Processing tx ${i} from ${this.transactions[i].sender.alias} to ${this.transactions[i].receiver.alias}`);
                await this.processTx(this.transactions[i]);
            }
        }
        this.client.disconnect();
    }

    private async processTx(tx: Transaction): Promise<void> {
        if (!tx.receiver.address) {
            this.logger.info(`Empty receiver address for '${tx.receiver.alias}', not sending.`);
            return
        }

        const amount = await this.determineAmount(tx.restriction, tx.sender.keystore, tx.receiver.address);

        return this.client.send(tx.sender.keystore, tx.receiver.address, amount);
    }

    private async processClaim(claim: Claim): Promise<void> {
        return this.client.claim(claim.keystore, claim.controllerAddress, this.isDeepHistoryCheckForced, this.gracePeriod);
    }

    private async processClaimThirdParty(claimer: Keystore, validatorTarger: Target): Promise<void> {
      return this.client.claimForValidator(validatorTarger.validatorAddress,claimer,this.isDeepHistoryCheckForced, this.gracePeriod);
  }

    private async determineAmount(restriction: TransactionRestriction, senderKeystore: Keystore, receiverAddr: string): Promise<Balance> {
        if (restriction.desired &&
            restriction.desired >= 0 &&
            restriction.remaining &&
            restriction.remaining >= 0) {
            this.logger.info(`desired (${restriction.desired}) and remaining (${restriction.remaining}) specified at the same time, not sending`);
            return ZeroBalance;
        }

        const senderBalance: Balance = await this.client.balanceOfKeystore(senderKeystore);
        if (senderBalance.lt(this.minimumSenderBalance)) {
            this.logger.info(`sender doesn't have enough funds: ${senderBalance}`);
            return ZeroBalance;
        }
        const remainingBalance = new BN(restriction.remaining) as Balance;
        if (senderBalance.lte(remainingBalance)) {
            this.logger.info(`sender doesn't have enough funds to leave ${remainingBalance} after the transaction: ${senderBalance}`);
            return ZeroBalance;
        }

        const receiverBalance: Balance = await this.client.balanceOf(receiverAddr);

        if (remainingBalance.eq(ZeroBalance) &&
            restriction.desired &&
            restriction.desired != 0) {
            const desired = new BN(restriction.desired);
            if (receiverBalance.gte(desired)) {
                this.logger.info(`no need to send anything, receiver balance ${receiverBalance} >= ${desired}`);
                return ZeroBalance;
            }
            const ideal = desired.sub(receiverBalance) as Balance;
            const availableSend = senderBalance.sub(this.minimumSenderBalance) as Balance;
            if (ideal.gt(availableSend)) {
                this.logger.info(`best effort, not enough funds in sender, sending ${availableSend}`);
                return availableSend;
            }
            //ideal
            return ideal;
        }

        if (remainingBalance.lt(this.minimumSenderBalance)) {
            this.logger.info(`restriction.remaining is < ${this.minimumSenderBalance} (${remainingBalance})`);
            return ZeroBalance;
        }
        return senderBalance.sub(remainingBalance) as Balance;
    }
}
