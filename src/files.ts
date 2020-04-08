import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';


export class Files {
    static readYAML(filePath: string): any {
        const rawContent = fs.readFileSync(path.resolve(__dirname, filePath)).toString();

        return yaml.safeLoad(rawContent);
    }
}
