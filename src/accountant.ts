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
    ApiClient, AccountantInputConfig, ClaimThirdParty, Target, GracePeriod
} from './types';
import { getErrorMessage } from './utils';

export class Accountant {
    private minimumSenderBalance: Balance;
    private isDeepHistoryCheckForced = false;
    private gracePeriod: GracePeriod = {enabled: false, eras: 0};
    private transactions: Array<Transaction> = [];
    private claims: Array<Claim> = [];
    private claimThirdParty: ClaimThirdParty;
    private claimsCheckOnly: Array<Target> = []

    constructor(
        cfg: AccountantInputConfig,
        private readonly client: ApiClient,
        private readonly logger: Logger) {
        this.minimumSenderBalance = new BN(cfg.minimumSenderBalance) as Balance
        if(cfg.transactions) this.transactions = cfg.transactions
        if(cfg.claims) this.claims = cfg.claims    
        if(cfg.claimThirdParty) this.claimThirdParty = cfg.claimThirdParty
        if(cfg.claimsCheckOnly) this.claimsCheckOnly = cfg.claimsCheckOnly
        if(cfg.isDeepHistoryCheckForced) this.isDeepHistoryCheckForced = cfg.isDeepHistoryCheckForced
        if(cfg.gracePeriod) this.gracePeriod = cfg.gracePeriod
    }

    async run(): Promise<void> {
        if(this.claimsCheckOnly.length > 0) {
          for (let i = 0; i < this.claimsCheckOnly.length; i++) {
            this.logger.info(`Processing checkOnlyClaim ${i} for ${this.claimsCheckOnly[i].alias}`);
            await this.processClaimCheckOnly(this.claimsCheckOnly[i]);
          }
          this.client.disconnect();
          return
        }
        if (this.claims.length > 0) {
            for (let i = 0; i < this.claims.length; i++) {
                this.logger.info(`Processing claim ${i} for ${this.claims[i].alias}`);
                await this.processClaim(this.claims[i]);
            }
        }
        if (this.claimThirdParty?.targets.length > 0) {
          for (let i = 0; i < this.claimThirdParty.targets.length; i++) {
              this.logger.info(`Processing third party claim ${i} for ${this.claimThirdParty.targets[i].alias}`);
              await this.processClaimThirdParty(this.claimThirdParty.claimerKeystore,this.claimThirdParty.targets[i]);
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
        try {
          await this.client.claim(claim.keystore, this.isDeepHistoryCheckForced, this.gracePeriod);
        } catch (error: unknown) {
          this.logger.error(`Could not process the claim for ${claim.alias}: ${error}`);
          const message = getErrorMessage(error)
          if(message.includes('Connection dropped') || message.includes('ECONNRESET')){
            this.logger.warn(`Retrying...`)
            await this.processClaim(claim)
          }
        }
    }

    private async processClaimThirdParty(claimer: Keystore, validatorTarget: Target): Promise<void> {
      try {
        await this.client.claimForValidator(validatorTarget.validatorAddress,claimer,this.isDeepHistoryCheckForced, this.gracePeriod);
      } catch (error) {
        this.logger.error(`Could not process the claim for ${validatorTarget.alias}: ${error}`);
        const message = getErrorMessage(error)
        if(message.includes('Connection dropped') || message.includes('ECONNRESET')){
          this.logger.warn(`Retrying...`)
          await this.processClaimThirdParty(claimer,validatorTarget)
        }
      }
    }
    
    private async processClaimCheckOnly(target: Target): Promise<void> {
      try {
        const unclaimedPayouts = await this.client.checkOnly(target.validatorAddress)
        if(unclaimedPayouts.length>0){
          this.logger.info(`${target.alias} has unclaimed rewards for era(s) ${unclaimedPayouts.toString()}`);
        }
        else{
          this.logger.info(`All the payouts have been claimed for validator ${target.alias}`);
        }
      } catch (error) {
        this.logger.error(`Could not process the claim for ${target.alias}: ${error}`);
        const message = getErrorMessage(error)
        if(message.includes('Connection dropped') || message.includes('ECONNRESET')){
          this.logger.warn(`Retrying...`)
          await this.processClaimCheckOnly(target)
        }
      }
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
