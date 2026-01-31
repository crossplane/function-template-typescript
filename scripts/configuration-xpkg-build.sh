#!/bin/sh

. ./env

set -xeu

mkdir -p ${XPKG_DIR}
  crossplane xpkg build \
  --package-root="package-configuration" \
  --examples-root="examples" \
  -o ${XPKG_DIR}/${CONFIGURATION_NAME}-v${VERSION}.xpkg
