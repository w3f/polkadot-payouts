import { LoggerMock, ClientMock } from './mocks';
import { Accountant } from '../src/accountant';

import { should } from 'chai';
import * as sinon from 'sinon';

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
const defaultTransactions = [
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
            desired: 10
        }
    }
];

let logger: LoggerMock;
let client: ClientMock;

describe('Accountant', () => {
    describe('transactions', () => {
        beforeEach(() => {
            logger = new LoggerMock();
            client = new ClientMock();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should process all the transactions in the config', async () => {
            const subject = new Accountant(defaultTransactions, [], client, logger);

            const stub = sandbox.stub(client, 'send');

            await subject.run();

            stub.calledTwice.should.be.true;
            stub.calledWith(keystore1, receiverAddr1, 0).should.be.true;
            stub.calledWith(keystore2, receiverAddr2, 0).should.be.true;
        });

        describe('restrictions', () => {
            it('should implement remaining');
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
