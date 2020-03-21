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

            await subject.run();

            stub.calledTwice.should.be.true;
            stub.calledWith(keystore1, receiverAddr1, senderBalance).should.be.true;
            stub.calledWith(keystore2, receiverAddr2, senderBalance).should.be.true;
        });

        describe('restrictions', () => {
            it('should implement remaining', async () => {
                const txs = defaultTransactions();
                const totalBalance = 250;
                const desiredRemaining = 100;
                const expectedSent = 150;

                txs.pop();

                txs[0].restriction = {
                    remaining: desiredRemaining,
                    desired: 0
                };

                const subject = new Accountant(txs, [], client, logger);

                const sendStub = sandbox.stub(client, 'send');
                const balanceOfStub = sandbox.stub(client, 'balanceOf');

                const senderBalance = new BN(totalBalance) as Balance;
                balanceOfStub.onFirstCall().resolves(senderBalance);

                await subject.run();

                sendStub.calledWith(keystore1, receiverAddr1, new BN(expectedSent) as Balance).should.be.true;
            });
            it('should default remaining to 1 if not defined');
            it('should return 0 if sender balance is less than 1');
            it('should return 0 if remaining is less than 1');
            it('should implement desired');
            it('should return 0 if receiver balance is >= desired');
            it('should return ');
            it('should implement remaining instead of desired if both are present');
        });
    });
});
