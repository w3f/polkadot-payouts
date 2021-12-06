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
import { delay, getErrorMessage } from './utils';

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
        await this.initClient()

        if(this.claimsCheckOnly.length > 0) {
          this.logger.info(`Processing claims checking them only...`)
          await this.processClaimsCheckOnly()
          this.client.disconnect();
          return
        }
        if (this.claims.length > 0) {
          this.logger.info(`Processing claims...`)
          await this.processClaims()
        }
        if (this.claimThirdParty?.targets.length > 0) {
          this.logger.info(`Processing third party claims...`)
          await this.processClaimsThirdParty()
        } 
        if (this.transactions.length > 0) {
          this.logger.info(`Processing transfers...`)
          await this.processTransfers()
        }
        
        this.client.disconnect();
    }

    private async initClient(): Promise<void> {
      await this.client.api()
    }

    private async processClaims(): Promise<void> {
      for (let i = 0; i < this.claims.length; i++) {
        this.logger.info(`Processing claim ${i} for ${this.claims[i].alias}`);
        await this.processClaim(this.claims[i]);
      }
    }

    private async processClaim(claim: Claim): Promise<void> {
      await this.handleConnectionRetries(
        async () => {
          await this.client.claim(claim.keystore, this.isDeepHistoryCheckForced, this.gracePeriod)
        },
        claim.alias
      )
    }

    private async processClaimsThirdParty(): Promise<void> {
      const promiseArray = []
      for (let i = 0; i < this.claimThirdParty.targets.length; i++) {
          this.logger.info(`Processing third party claim ${i} for ${this.claimThirdParty.targets[i].alias}`);
          promiseArray.push(this.processClaimThirdParty(this.claimThirdParty.claimerKeystore,this.claimThirdParty.targets[i]));
      }
      await Promise.all(promiseArray)
    }

    private async processClaimThirdParty(claimer: Keystore, validatorTarget: Target): Promise<void> {
      await this.handleConnectionRetries(
        async () => {
          await this.client.claimForValidator(validatorTarget.validatorAddress,claimer,this.isDeepHistoryCheckForced, this.gracePeriod);
        },
        validatorTarget.alias
      )
    }
    
    private async processClaimsCheckOnly(): Promise<void> {
      for (let i = 0; i < this.claimsCheckOnly.length; i++) {
        this.logger.info(`Processing checkOnlyClaim ${i} for ${this.claimsCheckOnly[i].alias}`);
        await this.processClaimCheckOnly(this.claimsCheckOnly[i]);
      }
    }

    private async processClaimCheckOnly(target: Target): Promise<void> {
      await this.handleConnectionRetries(
        async () => {
          await this.client.checkOnly(target.validatorAddress)
        },
        target.validatorAddress
      )
    }

    private async processTransfers(): Promise<void> {
      for (let i = 0; i < this.transactions.length; i++) {
        this.logger.info(`Processing tx ${i} from ${this.transactions[i].sender.alias} to ${this.transactions[i].receiver.alias}`);
        await this.processTransfer(this.transactions[i]);
      }
    }

    private async processTransfer(tx: Transaction): Promise<void> {
        if (!tx.receiver.address) {
            this.logger.info(`Empty receiver address for '${tx.receiver.alias}', not sending.`);
            return
        }

        const amount = await this.determineAmount(tx.restriction, tx.sender.keystore, tx.receiver.address);

        return this.client.send(tx.sender.keystore, tx.receiver.address, amount);
    }

    /* eslint-disable  @typescript-eslint/no-explicit-any */
    private async handleConnectionRetries(f: { (): any },alias: string): Promise<void> {
      let attempts = 0
      const maxAttempts = 5
      for(;;){
        try {
          //function
          await f()
          return
        } catch (error) {
          this.logger.error(`Could not process the claim for ${alias}: ${error}`);
          const message = getErrorMessage(error)
          if(
            (
              message.includes('Connection dropped') || 
              message.includes('ECONNRESET') || 
              message.includes('WebSocket is not connected')
              ) && 
            ++attempts < maxAttempts
            ){
            this.logger.warn(`Retrying...`)
            await delay(10000) //wait x seconds before retrying
          }
          else{
            throw error
          }
        }
      }
    }
    /* eslint-enable  @typescript-eslint/no-explicit-any */

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
