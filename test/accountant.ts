import BN from 'bn.js';
import { should } from 'chai';
import * as sinon from 'sinon';
import { Balance } from '@polkadot/types/interfaces';

import { LoggerMock, ClientMock } from './mocks';
import { Accountant } from '../src/accountant';


should();

type checkReceiverInput = {
    senderBalance?: number,
    receiverBalance?: number,
    remaining?: number,
    desired?: number,
    expectedSent?: number
}

const sandbox = sinon.createSandbox();
const keystore1 = {
    filePath: "filesecret1",
    passwordPath: "filepassword1"
};
const receiverAddr1 = "receiverAddr1";
const keystore2 = {
    filePath: "filesecret2",
    passwordPath: "filepassword2"
};
const receiverAddr2 = "receiverAddr2";
const defaultTransactions = () => [
    {
        sender: {
            keystore: keystore1,
            alias: "sender1",
            address: "sender1_addr"
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
            address: "sender2_addr"
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

let logger: LoggerMock;
let client: ClientMock;

describe('Accountant', () => {
    beforeEach(() => {
        logger = new LoggerMock();
        client = new ClientMock();
    });

    describe('transactions', () => {
        afterEach(() => {
            sandbox.restore();
        });

        it('should process all the transactions in the config', async () => {
            const subject = new Accountant(defaultTransactions(), client, logger);

            const stub = sandbox.stub(client, 'send');

            await subject.run();

            stub.calledTwice.should.be.true;
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
            it('should return 0 if sender balance is less than 1', async () => {
                await checkRestriction({
                    senderBalance: 500000000000,
                    remaining: 0,
                    desired: 0,
                    expectedSent: 0
                });
            });
            it('should return 0 if remaining is less than 1', async () => {
                await checkRestriction({
                    senderBalance: 200000000000000,
                    remaining: 500000000000,
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
                await checkRestriction({
                    senderBalance: 10000000000000,
                    receiverBalance: 50000000000000,
                    remaining: 0,
                    desired: 100000000000000,
                    expectedSent: 9000000000000
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
    });
});

async function checkRestriction(cfg: checkReceiverInput) {
    const txs = defaultTransactions();

    txs.pop();

    txs[0].restriction = {
        remaining: cfg.remaining,
        desired: cfg.desired,
    };

    const subject = new Accountant(txs, client, logger);

    const sendStub = sandbox.stub(client, 'send');
    const balanceOfStub = sandbox.stub(client, 'balanceOf');

    const senderBalance = new BN(cfg.senderBalance) as Balance;
    const receiverBalance = new BN(cfg.receiverBalance) as Balance;
    balanceOfStub.onFirstCall().resolves(senderBalance);
    balanceOfStub.onSecondCall().resolves(receiverBalance);

    await subject.run();

    const expectedSent = new BN(cfg.expectedSent) as Balance;
    sendStub.calledWith(keystore1, receiverAddr1, expectedSent).should.be.true;
}
