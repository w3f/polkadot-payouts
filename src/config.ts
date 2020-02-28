import path from 'path';
import process from 'process';

import { Files } from './files';


export class Config {
    static parse(rawCfgPath: string) {
        const cfgPath = path.resolve(process.cwd(), rawCfgPath);

        return Files.readYAML(cfgPath);
    }
}
