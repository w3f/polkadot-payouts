import { InputConfig, Logger } from '../src/types';
import { Cmd } from '../src/cmd';

export class E2ETests {
    private readonly dockerImageTag = 'web3f/watchtower:kind';

    constructor(private cfg: InputConfig, private logger: Logger, private cmd: Cmd) { }

    async run() { }
}
