#!/bin/sh

. ./env

set -xeu

crossplane xpkg push -f ${XPKG_DIR}/${CONFIGURATION_NAME}-v${VERSION}.xpkg ${XPKG_REPO}/${CONFIGURATION_NAME}:v${VERSION}
