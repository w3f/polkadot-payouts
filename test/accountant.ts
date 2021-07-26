import BN from 'bn.js';
import { should } from 'chai';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import * as tmp from 'tmp';
import { Balance } from '@w3f/polkadot-api-client';
import { Logger, createLogger } from '@w3f/logger';

import { ClientMock } from './mocks';
import { Accountant } from '../src/accountant';
import { Transaction, Claim } from '../src/types';

should();

type checkReceiverInput = {
    senderBalance?: number;
    receiverBalance?: number;
    remaining?: number;
    desired?: number;
    expectedSent?: number;
}

const sandbox = sinon.createSandbox();
const keystore1Content = '{"address": "sender1_addr","encoding":{"content":["", "s325519"]}}'
const tmpobj1 = tmp.fileSync();
fs.writeSync(tmpobj1.fd, keystore1Content);
const keystore1 = {
    filePath: tmpobj1.name,
    passwordPath: "filepassword1"
};
const receiverAddr1 = "receiverAddr1";
const keystore2Content = '{"address": "sender2_addr","encoding":{"content":["", "s325519"]}}'
const tmpobj2 = tmp.fileSync();
fs.writeSync(tmpobj2.fd, keystore2Content);
const keystore2 = {
    filePath: tmpobj2.name,
    passwordPath: "filepassword2"
};
const receiverAddr2 = "receiverAddr2";
const defaultTransactions = (): Transaction[] => [
    {
        sender: {
            keystore: keystore1,
            alias: "sender1",
        },
        receiver: {
            alias: "receiver1",
            address: receiverAddr1
        },
        restriction: {
            remaining: 0,
            desired: 10
        }
    },
    {
        sender: {
            keystore: keystore2,
            alias: "sender2",
        },
        receiver: {
            alias: "receiver2",
            address: receiverAddr2
        },
        restriction: {
            remaining: 0,
            desired: 10
        }
    }
];

const defaultClaims = (): Claim[] => [
    {
        keystore: keystore1,
        alias: "sender1",
    },
    {
        keystore: keystore2,
        alias: "sender2",
    }
];

let logger: Logger;
let client: ClientMock;

const MinimumSenderBalance = 10000000000;

async function checkRestriction(cfg: checkReceiverInput): Promise<void> {
    const txs = defaultTransactions();

    txs.pop();

    txs[0].restriction = {
        remaining: cfg.remaining,
        desired: cfg.desired,
    };

    const subject = new Accountant({transactions:txs, claims:[], minimumSenderBalance:MinimumSenderBalance}, client, logger);

    const sendStub = sandbox.stub(client, 'send');
    const balanceOfKeystoreStub = sandbox.stub(client, 'balanceOfKeystore');
    const balanceOfStub = sandbox.stub(client, 'balanceOf');

    const senderBalance = new BN(cfg.senderBalance) as Balance;
    const receiverBalance = new BN(cfg.receiverBalance) as Balance;
    balanceOfKeystoreStub.onFirstCall().resolves(senderBalance);
    balanceOfStub.onFirstCall().resolves(receiverBalance);

    await subject.run();

    const expectedSent = new BN(cfg.expectedSent) as Balance;
    sendStub.calledWith(keystore1, receiverAddr1, expectedSent).should.be.true;
}

describe('Accountant', () => {
    beforeEach(() => {
        logger = createLogger();
        client = new ClientMock();
    });

    describe('transactions', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('should process all the transactions in the config', async () => {
            const txs = defaultTransactions();
            const subject = new Accountant({transactions:txs, claims:[], minimumSenderBalance:MinimumSenderBalance}, client, logger);

            const stub = sandbox.stub(client, 'send');

            await subject.run();

            stub.callCount.should.eq(txs.length);
        });

        it('should allow undefined claims', async () => {
            const txs = defaultTransactions();
            const subject = new Accountant({transactions:txs, claims:undefined, minimumSenderBalance:MinimumSenderBalance}, client, logger);

            const stub = sandbox.stub(client, 'send');

            await subject.run();

            stub.callCount.should.eq(txs.length);
        });

        describe('restrictions', () => {
            it('should implement remaining', async () => {
                await checkRestriction({
                    senderBalance: 250000000000000,
                    remaining: 100000000000000,
                    desired: 0,
                    expectedSent: 150000000000000
                });
            });
            it('should implement remaining with undefined desired', async () => {
                await checkRestriction({
                    senderBalance: 250000000000000,
                    remaining: 100000000000000,
                    desired: undefined,
                    expectedSent: 150000000000000
                });
            });
            it('should return 0 if sender balance is less than minimum', async () => {
                const senderBalance = MinimumSenderBalance - 100;
                await checkRestriction({
                    senderBalance,
                    remaining: 0,
                    desired: 0,
                    expectedSent: 0
                });
            });
            it('should return 0 if remaining is less than minimum', async () => {
                const remaining = MinimumSenderBalance - 100;
                await checkRestriction({
                    senderBalance: 200000000000000,
                    remaining,
                    desired: 0,
                    expectedSent: 0
                });
            });
            it('should return 0 if sender balance is less than remaining', async () => {
                await checkRestriction({
                    senderBalance: 9000000000000,
                    remaining: 10000000000000,
                    desired: 0,
                    expectedSent: 0
                });
            });
            it('should implement desired', async () => {
                await checkRestriction({
                    senderBalance: 200000000000000,
                    receiverBalance: 50000000000000,
                    remaining: 0,
                    desired: 100000000000000,
                    expectedSent: 50000000000000
                });
            });
            it('should implement desired with undefined remaining', async () => {
                await checkRestriction({
                    senderBalance: 200000000000000,
                    receiverBalance: 50000000000000,
                    remaining: undefined,
                    desired: 100000000000000,
                    expectedSent: 50000000000000
                });
            });
            it('should return 0 if receiver balance is >= desired', async () => {
                await checkRestriction({
                    senderBalance: 200000000000000,
                    receiverBalance: 300000000000000,
                    remaining: 0,
                    desired: 100000000000000,
                    expectedSent: 0
                });
            });
            it('should send desired on best effort', async () => {
                const senderBalance = 10000000000000;
                const expectedSent = senderBalance - MinimumSenderBalance;
                await checkRestriction({
                    senderBalance,
                    receiverBalance: 50000000000000,
                    remaining: 0,
                    desired: 100000000000000,
                    expectedSent: expectedSent
                });
            });
            it('should return 0 if both remaining and desired are present', async () => {
                await checkRestriction({
                    senderBalance: 1000000000000000,
                    receiverBalance: 50000000000000,
                    remaining: 100000000000000,
                    desired: 100000000000000,
                    expectedSent: 0
                });
            });
        });
        describe('empty actors', () => {
            it('should not try to send when receciver address is empty', async () => {
                const txs = defaultTransactions();

                txs.pop();

                delete txs[0].receiver.address;

                const subject = new Accountant({transactions:txs, claims:[], minimumSenderBalance:MinimumSenderBalance}, client, logger);

                const stub = sandbox.stub(client, 'send');

                await subject.run();

                stub.notCalled.should.be.true;
            });
            it('should get the sender address from the keystore', async () => {
                const senderAddress = 'sender-address-from-keystore';
                const receiverAddress = 'receciver-address-not-from-keystore';

                const fileContent = `{"address":"${senderAddress}","encoded":"encoded-content","encoding":{"content":["pkcs8","ed25519"],"type":"xsalsa20-poly1305","version":"2"},"meta":{}}`;

                const tmpobj = tmp.fileSync();
                fs.writeSync(tmpobj.fd, fileContent);

                const txs = defaultTransactions();

                txs.pop();

                txs[0].sender.keystore = {
                    filePath: tmpobj.name,
                    passwordPath: 'passwordpath'
                };
                txs[0].receiver.address = receiverAddress;

                sandbox.stub(client, 'send');
                const balanceOfStub = sandbox.stub(client, 'balanceOf');
                const balanceOfKeystoreStub = sandbox.stub(client, 'balanceOfKeystore');

                const senderBalance = new BN(100) as Balance;
                const receiverBalance = new BN(100) as Balance;
                balanceOfKeystoreStub.onFirstCall().resolves(senderBalance);
                balanceOfStub.onFirstCall().resolves(receiverBalance);

                const subject = new Accountant({transactions:txs, claims:[], minimumSenderBalance:MinimumSenderBalance}, client, logger);
                await subject.run();

                balanceOfKeystoreStub.calledWith(txs[0].sender.keystore).should.be.true;
            });
        });
    });

    describe('claims', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('should process all the claims in the config', async () => {
            const claims = defaultClaims();
            const subject = new Accountant({transactions:[], claims, minimumSenderBalance:MinimumSenderBalance}, client, logger);

            const stub = sandbox.stub(client, 'claim');

            await subject.run();

            stub.callCount.should.eq(claims.length);
        });

        it('should allow undefined transactions', async () => {
            const claims = defaultClaims();
            const subject = new Accountant({transactions:undefined, claims, minimumSenderBalance:MinimumSenderBalance}, client, logger);

            const stub = sandbox.stub(client, 'claim');

            await subject.run();

            stub.callCount.should.eq(claims.length);
        });
    });
});
