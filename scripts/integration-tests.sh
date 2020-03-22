#!/bin/bash

source /scripts/common.sh
source /scripts/bootstrap-helm.sh

wait_job_present(){
    local job=$1
    local namespace=${2:-default}
    local TOTAL_WAIT_TIME=40
    local NEXT_WAIT_TIME=0

    until [ "$(kubectl get cronjob -n ${namespace} | grep -m 1 ${job} | awk '{print $1}')" = "${job}" ] || [ $NEXT_WAIT_TIME -eq $TOTAL_WAIT_TIME ]; do
        echo "$(kubectl get cronjob -n ${namespace} | grep -m 1 ${job})"
        echo "${job} in namespace ${namespace} not present yet..."
        sleep $(( NEXT_WAIT_TIME++ ))
    done

    if [ $NEXT_WAIT_TIME -eq $TOTAL_WAIT_TIME ]; then
        echo "${job} in namespace ${namespace} not present in time, exiting"
        exit 1
    fi
}

run_tests() {
    echo Running tests...

    wait_job_present accountant accountant
}

teardown() {
    helmfile delete --purge
}

main(){
    if [ -z "$KEEP_W3F_ACCOUNTANT" ]; then
        trap teardown EXIT
    fi

    source /scripts/build-helmfile.sh

    run_tests
}

main
