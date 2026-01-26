#!/bin/sh

source ./env

set -xe

crossplane xpkg push -f ${XPKG_DIR}/${FN_NAME}-amd64-v${VERSION}.xpkg,${XPKG_DIR}/${FN_NAME}-arm64-v${VERSION}.xpkg ${XPKG_REPO}/${FN_NAME}:v${VERSION}
