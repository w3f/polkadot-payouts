import '@polkadot/api-augment'; //https://github.com/polkadot-js/api/issues/4450
import fs from 'fs-extra';
import { Keyring } from '@w3f/polkadot-api-client';
import { should } from 'chai';
import { TestPolkadotRPC } from '@w3f/test-utils';
import tmp from 'tmp';

import { Client } from '../src/client';
import { Keystore } from '../src/types';

should();

const testRPC = new TestPolkadotRPC();
let subject: Client;
let keyring: Keyring;

describe('Client', () => {
    before(async () => {
        await testRPC.start();
        keyring = new Keyring({ type: 'sr25519' });
    });

    after(async () => {
        await testRPC.stop();
    });

    beforeEach(() => {
        subject = new Client(testRPC.endpoint());
    })

    it('should try to retrieve claims', async () => {
        const alice = keyring.addFromUri('//Alice');
        const pass = 'pass';
        const aliceKeypairJson = keyring.toJson(alice.address, pass);
        const ksFile = tmp.fileSync();
        fs.writeSync(ksFile.fd, JSON.stringify(aliceKeypairJson));
        const passFile = tmp.fileSync();
        fs.writeSync(passFile.fd, pass);
        const ks: Keystore = { filePath: ksFile.name, passwordPath: passFile.name };

        await subject.claim(ks);
    });

});
