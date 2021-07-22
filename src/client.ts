import {
  Client as ClientW3f,
  Keystore,
  ZeroBN,
} from '@w3f/polkadot-api-client';
import { StakingLedger } from '@polkadot/types/interfaces'
import waitUntil from 'async-wait-until';

export class Client extends ClientW3f {

  public async claim(validatorKeystore: Keystore, controllerAddress: string, isHistoryCheckForced = false): Promise<void> {
        if (this.apiNotReady()) {
            await this.connect();
        }

        const maxBatchedTransactions = 9;
        const keyPair = this.getKeyPair(validatorKeystore);

        const currentEra = (await this._api.query.staking.activeEra()).unwrapOr(null);
        if (!currentEra) {
            throw new Error('Could not get current era');
        }
        const ledgerPr = await this._api.query.staking.ledger(controllerAddress);
        const ledger: StakingLedger = ledgerPr.unwrapOr(null);

        if (!ledger) {
            throw new Error(`Could not get ledger for ${keyPair.address}`);
        }
        let lastReward: number;
        if ( isHistoryCheckForced || ledger.claimedRewards.length == 0 ) {
            lastReward = (await this._api.query.staking.historyDepth()).toNumber();
        } else {
            lastReward = ledger.claimedRewards.pop().toNumber();
        }

        let numOfUnclaimPayouts = currentEra.index - lastReward - 1;
        let start = 1;
        while (numOfUnclaimPayouts > 0) {
            const payoutCalls = [];
            let txLimit = numOfUnclaimPayouts;
            if (numOfUnclaimPayouts > maxBatchedTransactions) {
                txLimit = maxBatchedTransactions;
            }

            for (let i = start; i <= txLimit + start - 1; i++) {
                const idx = lastReward + i;
                const exposure = await this._api.query.staking.erasStakers(idx, keyPair.address);
                this.logger.info(`exposure: ${exposure}`);
                if (exposure.total.toBn().gt(ZeroBN)) {
                    this.logger.info(`Adding claim for ${keyPair.address}, era ${idx}`);
                    payoutCalls.push(this._api.tx.staking.payoutStakers(keyPair.address, idx));
                }
            }
            this.currentTxDone = false;
            try {
                await this._api.tx.utility
                    .batch(payoutCalls)
                    .signAndSend(keyPair, this.sendStatusCb.bind(this));
            } catch (e) {
                this.logger.error(`Could not request claim for ${keyPair.address}: ${e}`);
            }
            try {
                await waitUntil(() => this.currentTxDone, 48000, 500);
            } catch (error) {
                this.logger.info(`tx failed: ${error}`);
            }
            numOfUnclaimPayouts -= txLimit;
            start += txLimit;
        }
        this.logger.info(`All payouts have been claimed for ${keyPair.address}.`);
    }

  //   public async claimThird(validatorAddress: string, controllerAddress: string, isHistoryCheckForced = false): Promise<void> {
  //     if (this.apiNotReady()) {
  //         await this.connect();
  //     }

  //     const maxBatchedTransactions = 9;

  //     const currentEra = (await this._api.query.staking.activeEra()).unwrapOr(null);
  //     if (!currentEra) {
  //         throw new Error('Could not get current era');
  //     }
  //     const ledgerPr = await this._api.query.staking.ledger(controllerAddress);
  //     const ledger: StakingLedger = ledgerPr.unwrapOr(null);

  //     if (!ledger) {
  //         throw new Error(`Could not get ledger for ${validatorAddress}`);
  //     }
  //     let lastReward: number;
  //     if ( isHistoryCheckForced || ledger.claimedRewards.length == 0 ) {
  //         lastReward = (await this._api.query.staking.historyDepth()).toNumber();
  //     } else {
  //         lastReward = ledger.claimedRewards.pop().toNumber();
  //     }

  //     let numOfUnclaimPayouts = currentEra.index - lastReward - 1;
  //     let start = 1;
  //     while (numOfUnclaimPayouts > 0) {
  //         const payoutCalls = [];
  //         let txLimit = numOfUnclaimPayouts;
  //         if (numOfUnclaimPayouts > maxBatchedTransactions) {
  //             txLimit = maxBatchedTransactions;
  //         }

  //         for (let i = start; i <= txLimit + start - 1; i++) {
  //             const idx = lastReward + i;
  //             const exposure = await this._api.query.staking.erasStakers(idx, validatorAddress);
  //             this.logger.info(`exposure: ${exposure}`);
  //             if (exposure.total.toBn().gt(ZeroBN)) {
  //                 this.logger.info(`Adding claim for ${validatorAddress}, era ${idx}`);
  //                 payoutCalls.push(this._api.tx.staking.payoutStakers(validatorAddress, idx));
  //             }
  //         }
  //         this.currentTxDone = false;
  //         try {
  //             await this._api.tx.utility
  //                 .batch(payoutCalls)
  //                 .signAndSend(keyPair, this.sendStatusCb.bind(this));
  //         } catch (e) {
  //             this.logger.error(`Could not request claim for ${validatorAddress}: ${e}`);
  //         }
  //         try {
  //             await waitUntil(() => this.currentTxDone, 48000, 500);
  //         } catch (error) {
  //             this.logger.info(`tx failed: ${error}`);
  //         }
  //         numOfUnclaimPayouts -= txLimit;
  //         start += txLimit;
  //     }
  //     this.logger.info(`All payouts have been claimed for ${validatorAddress}.`);
  // }
}

