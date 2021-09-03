/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */

'use strict';

const data = {};
module.exports = data;

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
}, {
  // Use default edv dev `id` and `serviceId`
  id: 'urn:uuid:dbd15f08-ff67-11eb-893b-10bf48838a41',
  name: 'Example EDV',
  service: {
    // default dev `id` configured in `bedrock-edv-storage`
    id: 'did:key:z6MkhNyDoLpNcPv5grXoJSJVJjvApd46JU5nPL6cwi88caYW',
    type: 'edv',
  }
}];

for(const product of products) {
  data.productIdMap.set(product.id, product);
  data.productIdMap.set(product.name, product);
}
