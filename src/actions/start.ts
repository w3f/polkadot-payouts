import { createLogger } from '@w3f/logger';
import { Client } from '../client';
import { Config } from '@w3f/config';

import { Accountant } from '../accountant';
import { InputConfig } from '../types';


export async function startAction(cmd): Promise<void> {
    const cfg = new Config<InputConfig>().parse(cmd.config);

    const logger = createLogger(cfg.logLevel);

    const client = new Client(cfg.wsEndpoint, logger);

    const accountant = new Accountant(cfg, client, logger);

    try {
        await accountant.run();
    } catch (e) {
        logger.error(`During accountant run: ${e.toString()}`);
        process.exit(-1);
    }
}
