import { Cmd } from '../cmd';
import { Config } from '../config';
import { createLogger } from '../logger';
import { E2ETests } from '../../e2e-tests';


export async function startE2ETestsAction(cmd: any): Promise<void> {
    const cfg = Config.parse(cmd.config);
    const logger = createLogger(cfg.logLevel);
    const cmdManager = new Cmd(logger);

    const e2eTests = new E2ETests(cfg, logger, cmdManager);

    await e2eTests.run();
}
