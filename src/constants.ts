import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

export const ZeroBalance = new BN(0) as Balance;
export const MinimumSenderBalance = new BN(1000000000000) as Balance;
