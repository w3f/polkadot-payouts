import path from 'path';
import process from 'process';

import { Files } from './files';
import { InputConfig } from './types';


export class Config {
    static parse(rawCfgPath: string): InputConfig {
        const cfgPath = path.resolve(process.cwd(), rawCfgPath);

        const cfg = Files.readYAML(cfgPath) as InputConfig;

        return cfg;
    }
}
