import {
  Client as ClientW3f,
  Keystore,
  ZeroBN,
} from '@w3f/polkadot-api-client';
import waitUntil from 'async-wait-until';
import { GracePeriod } from './types';

export class Client extends ClientW3f {

  public async claim(validatorKeystore: Keystore, isHistoryCheckForced = false, gracePeriod: GracePeriod = {enabled: false, eras: 0}): Promise<number> {
    const keyPair = this.getKeyPair(validatorKeystore);
    return await this.claimGeneral(keyPair.address,validatorKeystore,isHistoryCheckForced,gracePeriod)
  }

  public async claimForValidator(validatorAddress: string, claimerKeystore: Keystore, isHistoryCheckForced = false, gracePeriod: GracePeriod = {enabled: false, eras: 0} ): Promise<number> {
    return await this.claimGeneral(validatorAddress,claimerKeystore,isHistoryCheckForced,gracePeriod)
  }

  async claimGeneral(validatorAddress: string, claimerKeystore: Keystore, isHistoryCheckForced = false, gracePeriod: GracePeriod = {enabled: false, eras: 0} ): Promise<number> {
    if (this.apiNotReady()) {
        await this.connect();
    }

    const maxBatchedTransactions = 9;
    const keyPair = this.getKeyPair(claimerKeystore);

    const currentEra = (await this._api.query.staking.activeEra()).unwrapOr(null);
    if (!currentEra) {
        throw new Error('Could not get current era');
    }

    const lastReward = await this.getLastReward(validatorAddress,isHistoryCheckForced)

    let numOfUnclaimPayouts = currentEra.index - lastReward - 1;
    let start = 1;
    let numOfClaimedPayouts = 0
    while (numOfUnclaimPayouts > 0) {
        const payoutCalls = [];
        let txLimit = numOfUnclaimPayouts;
        if (numOfUnclaimPayouts > maxBatchedTransactions) {
            txLimit = maxBatchedTransactions;
        }

        for (let i = start; i <= txLimit + start - 1; i++) {
            const idx = lastReward + i;

            const isGracePeriodSatisfied = !gracePeriod.enabled || (  currentEra.index - idx > gracePeriod.eras )
            
            const exposure = await this._api.query.staking.erasStakers(idx, validatorAddress);
            if (exposure.total.toBn().gt(ZeroBN) && isGracePeriodSatisfied ) {
                this.logger.info(`Adding claim for ${validatorAddress}, era ${idx}`);
                payoutCalls.push(this._api.tx.staking.payoutStakers(validatorAddress, idx));
            }
        }
        this.currentTxDone = false;
        try {
            if (payoutCalls.length > 0) {
              await this._api.tx.utility
                  .batch(payoutCalls)
                  .signAndSend(keyPair, this.sendStatusCb.bind(this));
              numOfClaimedPayouts += payoutCalls.length
            }
            else{
              this.currentTxDone = true
            }
        } catch (e) {
            this.logger.error(`Could not request claim for ${validatorAddress}: ${e}`);
        }
        try {
            await waitUntil(() => this.currentTxDone, 48000, 500);
        } catch (error) {
            this.logger.info(`tx failed: ${error}`);
        }
        numOfUnclaimPayouts -= txLimit;
        start += txLimit;
    }
    //this.logger.info(`All payouts ( ${numOfClaimedPayouts} ) have been claimed for ${validatorAddress}.`);
    return numOfClaimedPayouts
  }

  public async checkOnly(validatorAddress: string ): Promise<number[]> {
    if (this.apiNotReady()) {
        await this.connect();
    }

    const currentEra = (await this._api.query.staking.activeEra()).unwrapOr(null);
    if (!currentEra) {
        throw new Error('Could not get current era');
    }

    const lastReward = await this.getLastReward(validatorAddress)

    const numOfPotentialUnclaimedPayouts = currentEra.index - lastReward - 1;
    const unclaimedPayouts = []
    for ( let i = 1; i <= numOfPotentialUnclaimedPayouts; i++) {

      const idx = lastReward + i;
      const exposure = await this._api.query.staking.erasStakers(idx, validatorAddress);
      if (exposure.total.toBn().gt(ZeroBN)) {
        unclaimedPayouts.push(idx)
      }
    }

    return unclaimedPayouts    
  }

  async getLastReward(validatorAddress: string, isHistoryCheckForced = false): Promise<number> {

    const ledger = (await this._api.derive.staking.account(validatorAddress)).stakingLedger

    if (!ledger) {
        throw new Error(`Could not get ledger for ${validatorAddress}`);
    }
    let lastReward: number;
    if ( isHistoryCheckForced || ledger.claimedRewards.length == 0 ) {
        lastReward = (await this._api.query.staking.historyDepth()).toNumber();
    } else {
        lastReward = ledger.claimedRewards.pop().toNumber();
    }

    return lastReward
  }

}

