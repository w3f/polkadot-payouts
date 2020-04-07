import { createLogger } from '@w3f/logger';
import { Client } from '@w3f/polkadot-api-client';

import { Accountant } from '../accountant';
import { Config } from '../config';


export async function startAction(cmd: any) {
    const cfg = Config.parse(cmd.config);

    const logger = createLogger(cfg.logLevel);

    const client = new Client(cfg.wsEndpoint);

    const accountant = new Accountant(cfg.transactions, client, logger);

    await accountant.run();
}
