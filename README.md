[![CircleCI](https://circleci.com/gh/w3f/polkadot-payouts.svg?style=svg)](https://circleci.com/gh/w3f/polkadot-payouts)

# polkadot-payouts

Utility to claim and transfer your Kusama/Polkadot validattor rewards.

# How it works

The tool uses a configuration file to request pending payout claims and optionally send the rewards to different accounts. 

You can start by cloning the repo and installiing the dependencies, NodeJS and Yarn are required:
```
$ git clone https://github.com/w3f/polkadot-payouts
$ cd polkadot-payouts
$ yarn
```
Then you should create a configuration file, you can start by copying a sample provided with the repo and customizing it:
```
$ cp config/main.sample.yaml config/main.yaml
```
Now you can customize `config/main.yaml`, this is a typical configuration file:
```
# config/main.yaml
logLevel: info
wsEndpoint: "wss://kusama-rpc.polkadot.io/"
claims:
- alias: validator-000
  controllerAddress: "<validator-000-controller-address>"
  keystore:
    filePath: /path/to/validator-000/keystore
    passwordPath: /path/to/validator-000/keystore/password
- alias: validator-001
  controllerAddress: "<validator-001-controller-address>"
  keystore:
    filePath: /path/to/validator-001/keystore
    passwordPath: /path/to/validator-001/keystore/password
transactions:
- sender:
    alias: validator-000
    keystore:
      filePath: /path/to/validator-000/keystore
      passwordPath: /path/to/validator-000/keystore/password
  receiver:
    alias: validator-rewards
    address: "<validator-rewards-address>"
  restriction:
    remaining: 10000000000000 # leave this much in the sender, send the rest
- sender:
    alias: validator-001
    keystore:
      filePath: /path/to/validator-001/keystore
      passwordPath: /path/to/validator-001/keystore/password
  receiver:
    alias: validator-rewards
    address: "<validator-rewards-address>"
  restriction:
    desired: 10000000000000 # send desired - current_receiver_balance, if current_receiver_balance >= desired noop
```
You should define the RPC endpoint to use in the `wsEndpoint` field. There are two main blocks, one for `claims` and other
for `transactions`.

### Claims
This block is an arrray of elements that describe each of the reward claims to perform. They should include the address
of the controller account of the validator and information about the validator stash keystore, the path of the keystore
file and the path of a file containing the password of the keystore. You take special ccare to make this files only
accessible by the user running the tool.

## Transactions
Each of the transaction elements should have information about the sender and the receciver. For the sender, the keystore
information is enough. For the receiver you need to specify the address and a potential restriction in the transaction. The 
restriction can have two different fields:
* remaining: leave this much in the sender, send the rest
* desired: send desired minus the receiver current balance, so that at the end the reeiver balance matches the `desired` value. If the balance of the receiver is greater than the desired vallue then no action is taken.
