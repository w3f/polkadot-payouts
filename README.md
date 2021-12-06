[![CircleCI](https://circleci.com/gh/w3f/polkadot-payouts.svg?style=svg)](https://circleci.com/gh/w3f/polkadot-payouts)

# polkadot-payouts

Utility to claim and transfer your Kusama/Polkadot validator rewards.

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
Now you can customize `config/main.yaml`, see the following configurations about how to do it. Once you are done you
can run the tool with:
```
$ yarn start
```

# Helm Chart

A helm chart for a deployment on Kubernetes could be found [here](https://github.com/w3f/polkadot-k8s-payouts)

# Features

- Claim for a third party
- Check Only for missing claims
- Claim, each for himslef
- Transfer to a destination wallet what you have just claimed

# Configuration - Claim for a third party
This is a typical configuration file to use the "Claim for a third party" feature:
```
# config/main.yaml
logLevel: info
wsEndpoint: "wss://kusama-rpc.polkadot.io/"
claimsThirdParty:
  claimerKeystore:
    filePath: /path/to/validator-000/keystore
    passwordPath: /path/to/validator-000/keystore/password
  targets:
  - alias: validator-000
    validatorAddress: "<validator-000-stash-address>"
  - alias: validator-001
    validatorAddress: "<validator-001-stash-address>"  
```
You should define the RPC endpoint to use in the `wsEndpoint` field.

### ClaimsThirdPary
This block is composed by two elements:  
- The Claimer Keystore: it includes the information about the claimer account keystore, in particular the paths to the keystore file and the password file.  
- An array of elements/targets that describe each of the reward claims to perform. It should include information on the addresses of the validators you are willing to take care of

# About - Keystore Password File

The password file should not contain any trailing new line charaters, therefore you could use this command to be sure to create a properly formatted password file: `echo -n "yourPassword" > yourFileName`

# Optional - Grace Period
This is an optional parameter you can add to configure a grace period limitation you wish to introduce: it will prevent a claim to be triggered if the validator rewards is not "old" enough eras from the current one.  
For example, in Kusama this is equivalent to a grace period of 4 days:  
```
# config/main.yaml
logLevel: info
wsEndpoint: "wss://kusama-rpc.polkadot.io/"
gracePeriod:
  enabled: true
  eras: 16
claimsThirdParty:
  claimerKeystore:
    filePath: /path/to/validator-000/keystore
    passwordPath: /path/to/validator-000/keystore/password
  targets:
  - alias: validator-000
    validatorAddress: "<validator-000-stash-address>"
  - alias: validator-001
    validatorAddress: "<validator-001-stash-address>"  
```

# Configuration - Check Only for missing claims
This is a typical configuration file to use the "Check Only for missing claims" feature:
```
# config/main.yaml
logLevel: info
wsEndpoint: "wss://kusama-rpc.polkadot.io/"
claimsCheckOnly:
- alias: validator-000
  validatorAddress: "<validator-000-stash-address>"
- alias: validator-001
  validatorAddress: "<validator-001-stash-address>" 
```
You should define the RPC endpoint to use in the `wsEndpoint` field.

# Configuration - Claim, each for himslef, and transfer to a destination wallet
This is a typical configuration file to use the "Claim for yourself and transfer to destination wallet" feature:
```
# config/main.yaml
logLevel: info
wsEndpoint: "wss://kusama-rpc.polkadot.io/"
minimumSenderBalance: 100000000000 # bellow this value transfers are not sent by the tool
claims:
- alias: validator-000
  keystore:
    filePath: /path/to/validator-000/keystore
    passwordPath: /path/to/validator-000/keystore/password
- alias: validator-001
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
This block is an array of elements that describe each of the reward claims to perform. They should include the information about the validator stash keystore, in particular the paths of the keystore file and the password file. You take special care to make these files only
accessible by the user running the tool.

### Transactions
Each of the transaction elements should have information about the sender and the receciver. For the sender, the keystore
information is enough. For the receiver you need to specify the address and a potential restriction in the transaction. The
restriction can have two different fields:
* remaining: leave this much in the sender, send the rest
* desired: send desired minus the receiver current balance, so that at the end the reeiver balance matches the `desired` value. If the balance of the receiver is greater than the desired vallue then no action is taken.
