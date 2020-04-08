import { Client } from '@w3f/polkadot-api-client';
import { TestRPC } from '@w3f/test-utils';
import { Keyring } from '@polkadot/api';
import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';
import { should } from 'chai';
import fs from 'fs-extra';
import tmp from 'tmp';

import { startAction } from '../src/actions/start';

should();

const testRPC = new TestRPC();
const client = new Client(testRPC.endpoint());
let keyring: Keyring;


describe('E2E', () => {
    before(async () => {
        await testRPC.start();
        keyring = new Keyring({ type: 'sr25519' });
    });

    after(async () => {
        await testRPC.stop();
    });

    it('should send the transactions with remaining restriction', async () => {
        const restriction = new BN('5000000000000');
        const restrictionString = `remaining: ${restriction}`;

        await checkAccountant(restriction, restrictionString);
    });

    it('should send the transactions with desired restriction', async () => {
        const restriction = new BN('1500000000000000000');
        const restrictionString = `desired: ${restriction}`;

        await checkAccountant(restriction, restrictionString);
    });
});

async function checkAccountant(restriction: BN, restrictionString: string): Promise<void> {
    const alice = keyring.addFromUri('//Alice');
    const bob = keyring.addFromUri('//Bob');

    const pass = 'pass';
    const aliceKeypairJson = keyring.toJson(alice.address, pass);
    const ksFile = tmp.fileSync();
    fs.writeSync(ksFile.fd, JSON.stringify(aliceKeypairJson));
    const passFile = tmp.fileSync();
    fs.writeSync(passFile.fd, pass);

    const aliceInitBalance = await client.balanceOf(alice.address);
    const bobInitBalance = await client.balanceOf(bob.address);

    const cfgContent = `
logLevel: info
wsEndpoint: ${testRPC.endpoint()}
transactions:
- sender:
    alias: alice
    address: ${alice.address}
    keystore:
      filePath: ${ksFile.name}
      passwordPath: ${passFile.name}
  receiver:
    alias: bob
    address: ${bob.address}
  restriction:
    ${restrictionString}
`;
    const cfgFile = tmp.fileSync();
    fs.writeSync(cfgFile.fd, cfgContent);

    await startAction({ config: cfgFile.name });

    const bobFinalBalance = await client.balanceOf(bob.address);

    const expectedSend = aliceInitBalance.sub(new BN(restriction) as Balance);
    const expected = bobInitBalance.add(expectedSend);

    bobFinalBalance.eq(expected).should.be.true;
}
