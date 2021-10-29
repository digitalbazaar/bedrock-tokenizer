/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */

'use strict';

const data = {};

// mock product IDs and reverse lookup for webkms/edv/etc service products
data.productIdMap = new Map();

const products = [{
  // Use default webkms dev `id` and `serviceId`
  id: 'urn:uuid:80a82316-e8c2-11eb-9570-10bf48838a29',
  name: 'Example KMS',
  service: {
    // default dev `id` configured in `bedrock-kms-http`
    id: 'did:key:z6MkwZ7AXrDpuVi5duY2qvVSx1tBkGmVnmRjDvvwzoVnAzC4',
    type: 'webkms',
  }
}];

for(const product of products) {
  data.productIdMap.set(product.id, product);
  data.productIdMap.set(product.name, product);
}

const now = Date.now();
const mockRecord = {
  meta: {
    created: now,
    updated: now
  },
  tokenizer: {
    id: 'did:key:z6MkvyeeUsH7bY61YT8599RYUbytYjPt77k1mN6VT27S7LfM',
    secret: 'ky8aka7eZd976dy240e2nm_k_kUy-5H0TGDtm2pfqwY',
    state: 'pending'
  }
};

module.exports = {data, mockRecord};
