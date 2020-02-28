import path from 'path';
import process from 'process';

import { readYAML } from './files';
import { AccountantConfig } from './types';


export class Config {
    static parse(rawCfgPath: string): AccountantConfig {
        const cfgPath = path.resolve(process.cwd(), rawCfgPath);

        const cfg = readYAML(cfgPath) as AccountantConfig;

        return cfg;
    }
}
