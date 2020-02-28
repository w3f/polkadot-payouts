import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';


export function readYAML(filePath: string) {
    const rawContent = fs.readFileSync(path.resolve(__dirname, filePath)).toString();

    return yaml.safeLoad(rawContent);
}
