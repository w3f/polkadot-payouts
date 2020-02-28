import fs from 'fs-extra';
import tmp from 'tmp';

import { Config } from '../src/config';

import { should } from 'chai';

should();

describe('Config reader', () => {
    it('should read valid config files', () => {
        const fileContent = `
transactions:
- sender:
    alias: sender1
    address: sender1
    keystore:
      fileSecret: senderFile1
      passwordSecret: senderPassword1
  receiver:
    alias: receiver1
    address: receiver1
  restriction:
    remaining: 5
- sender:
    alias: sender2
    account: sender2
    keystore:
      fileSecret: senderFile2
      passwordSecret: senderSecret2
  receiver:
    alias: receiver2
    account: receiver2
  restriction:
    desired: 10
`;

        const tmpobj = tmp.fileSync();
        fs.writeSync(tmpobj.fd, fileContent);

        const result = Config.parse(tmpobj.name);

        result.should.be.a('Object');
    });

});
