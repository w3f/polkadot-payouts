import process from 'process';
import program from 'commander';

import { startAction } from './actions/start';
import { startE2ETestsAction } from './actions/e2e-tests';

program
    .command('start')
    .description('Starts the accountant.')
    .option('-c, --config [path]', 'Path to config file.', './config/main.yaml')
    .action(startAction);

program
    .command('e2e-tests')
    .description('Runs e2e tests.')
    .option('-c, --config [path]', 'Path to config file.', './config/main.yaml')
    .action(startE2ETestsAction);

program.allowUnknownOption(false)

program.parse(process.argv)
