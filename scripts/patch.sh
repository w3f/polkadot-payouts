#!/bin/bash
set -e

echo Pathing...

sed -i "/parity\/polkadot/c\      - image: parity\/polkadot:$latest_upstream " .circleci/config.yml

