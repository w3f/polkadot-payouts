import winston from 'winston';

import { Config } from '../config';
import { Accountant } from '../accountant';

export async function startAction(cmd: any) {
    const cfg = Config.parse(cmd.config);

    const logger = winston.createLogger({
        level: cfg.logLevel || 'info',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
        transports: [
            new winston.transports.Console()
        ]
    });

    const accountant = new Accountant(cfg.accountant, logger);

    await accountant.run();
}
