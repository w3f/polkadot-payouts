import { Accountant } from '../accountant';
import { Client } from '../client';
import { Config } from '../config';
import { createLogger } from '@w3f/logger';


export async function startAction(cmd: any) {
    const cfg = Config.parse(cmd.config);

    const logger = createLogger(cfg.logLevel);

    const client = new Client(cfg.wsEndpoint, logger);

    const accountant = new Accountant(cfg.transactions, client, logger);

    await accountant.run();
}
