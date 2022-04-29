/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import crypto from 'node:crypto';

export function adaptHmac({hmac} = {}) {
  const oldSign = hmac.sign;
  const oldVerify = hmac.verify;

  hmac.sign = async function sign({data, useCache = true}) {
    // first apply local sha256, then do original operation
    data = await _sha256(data);
    return oldSign.call(this, {data, useCache});
  };

  hmac.verify = async function verify({data, signature, useCache = true}) {
    // first apply local sha256, then do original operation
    data = await _sha256(data);
    return oldVerify.call(this, {data, signature, useCache});
  };
}

async function _sha256(buf) {
  return new Uint8Array(crypto.createHash('sha256').update(buf).digest());
}
