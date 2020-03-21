import { LoggerMock, ClientMock } from './mocks';
import { Accountant } from '../src/accountant';

import BN from 'bn.js';
import { should } from 'chai';
import * as sinon from 'sinon';
import { Balance } from '@polkadot/types/interfaces';

should();

const sandbox = sinon.createSandbox();
const keystore1 = {
    fileSecret: "filesecret1",
    passwordSecret: "filepassword1"
};
const receiverAddr1 = "receiverAddr1";
const keystore2 = {
    fileSecret: "filesecret2",
    passwordSecret: "filepassword2"
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
            const subject = new Accountant(defaultTransactions(), [], client, logger);

            const stub = sandbox.stub(client, 'send');
            const balanceOfStub = sandbox.stub(client, 'balanceOf');

            const senderBalance = new BN(200) as Balance;
            balanceOfStub.onFirstCall().resolves(senderBalance);
            balanceOfStub.onSecondCall().resolves(senderBalance);
            const expectedSent = senderBalance.sub(new BN((1))) as Balance;

            await subject.run();

            stub.calledTwice.should.be.true;
            stub.calledWith(keystore1, receiverAddr1, expectedSent).should.be.true;
            stub.calledWith(keystore2, receiverAddr2, expectedSent).should.be.true;
        });

        describe('restrictions', () => {
            it('should implement remaining', async () => {
                await checkRemaining({
                    totalBalance: 250,
                    remaining: 100,
                    desired: 0,
                    expectedSent: 150
                });
            });
            it('should default remaining to 1 if not defined', async () => {
                await checkRemaining({
                    totalBalance: 250,
                    remaining: 0,
                    desired: 0,
                    expectedSent: 249
                });
            });
            it('should return 0 if sender balance is less than 1', async () => {
                await checkRemaining({
                    totalBalance: 0.5,
                    remaining: 0,
                    desired: 0,
                    expectedSent: 0
                });
            });
            it('should return 0 if remaining is less than 1');
            it('should implement desired');
            it('should return 0 if receiver balance is >= desired');
            it('should return ');
            it('should implement remaining instead of desired if both are present');
        });
    });
});

async function checkRemaining(cfg: {
    totalBalance: number,
    remaining: number,
    desired: number,
    expectedSent: number
}) {
    const txs = defaultTransactions();

    txs.pop();

    txs[0].restriction = {
        remaining: cfg.remaining,
        desired: cfg.desired,
    };

    const subject = new Accountant(txs, [], client, logger);

    const sendStub = sandbox.stub(client, 'send');
    const balanceOfStub = sandbox.stub(client, 'balanceOf');

    const senderBalance = new BN(cfg.totalBalance) as Balance;
    balanceOfStub.onFirstCall().resolves(senderBalance);

    await subject.run();

    sendStub.calledWith(keystore1, receiverAddr1, new BN(cfg.expectedSent) as Balance).should.be.true;
}
