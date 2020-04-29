import { Client, Balance, Keyring } from '@w3f/polkadot-api-client';
import { TestPolkadotRPC } from '@w3f/test-utils';
import BN from 'bn.js';
import { should } from 'chai';
import fs from 'fs-extra';
import tmp from 'tmp';

import { startAction } from '../src/actions/start';

should();

const testRPC = new TestPolkadotRPC();
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

    it('should send the transactions with remaining and desired restrictions', async () => {
        const alice = keyring.addFromUri('//Alice');
        const bob = keyring.addFromUri('//Bob');
        const charlie = keyring.addFromUri('//Charlie');
        const ferdie = keyring.addFromUri('//Ferdie');

        const pass = 'pass';
        const passFile = tmp.fileSync();
        fs.writeSync(passFile.fd, pass);

        const aliceKeypairJson = keyring.toJson(alice.address, pass);
        const aliceKsFile = tmp.fileSync();
        fs.writeSync(aliceKsFile.fd, JSON.stringify(aliceKeypairJson));

        const charlieKeypairJson = keyring.toJson(charlie.address, pass);
        const charlieKsFile = tmp.fileSync();
        fs.writeSync(charlieKsFile.fd, JSON.stringify(charlieKeypairJson));

        const aliceInitBalance = await client.balanceOf(alice.address);
        const bobInitBalance = await client.balanceOf(bob.address);

        const remaining = new BN("5000000000000");
        const desired = new BN("1500000000000000000");
        const cfgContent = `
logLevel: info
wsEndpoint: ${testRPC.endpoint()}
transactions:
- sender:
    alias: alice
    address: ${alice.address}
    keystore:
      filePath: ${aliceKsFile.name}
      passwordPath: ${passFile.name}
  receiver:
    alias: bob
    address: ${bob.address}
  restriction:
    remaining: "${remaining}"
- sender:
    alias: charlie
    address: ${charlie.address}
    keystore:
      filePath: ${charlieKsFile.name}
      passwordPath: ${passFile.name}
  receiver:
    alias: ferdie
    address: ${ferdie.address}
  restriction:
    desired: "${desired}"
`;
        const cfgFile = tmp.fileSync();
        fs.writeSync(cfgFile.fd, cfgContent);

        await startAction({ config: cfgFile.name });

        const bobFinalBalance = await client.balanceOf(bob.address);

        const expectedOneSend = aliceInitBalance.sub(new BN(remaining) as Balance);
        const expectedOne = bobInitBalance.add(expectedOneSend);

        bobFinalBalance.eq(expectedOne).should.be.true;

        const ferdieFinalBalance = await client.balanceOf(ferdie.address);
        ferdieFinalBalance.eq(desired).should.be.true;
    });
});
