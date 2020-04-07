import { Buffer } from 'buffer';
import { spawn } from 'child_process';
import { Logger } from '@w3f/logger';

import { CmdOptions } from './types';

export class Cmd {
    constructor(private logger: Logger) { }

    async exec(command: string, options: CmdOptions = { verbose: true }): Promise<string> {
        return new Promise((resolve, reject) => {
            const items = command.split(' ');
            const child = spawn(items[0], items.slice(1), options);
            if (options.detached) {
                child.unref();
                resolve(`${child.pid}`);
                return;
            }
            let match = false;
            let output = Buffer.from('');

            child.stdout.on('data', (data) => {
                if (options.matcher && options.matcher.test(data)) {
                    match = true;
                    child.kill('SIGTERM');
                    resolve();
                    return;
                }
                output = Buffer.concat([output, data]);
                if (options.verbose) {
                    this.logger.info(data.toString());
                }
            });

            child.stderr.on('data', (data) => {
                output = Buffer.concat([output, data]);
                if (options.verbose) {
                    this.logger.info(data.toString());
                }
            });

            child.on('close', (code) => {
                if (code !== 0 && !match) {
                    this.logger.info(`ERROR: Command execution failed with code: ${code}`);
                    reject(new Error(`code: ${code}`));
                }
                else {
                    resolve(output.toString());
                }
            });
        });
    }
}
