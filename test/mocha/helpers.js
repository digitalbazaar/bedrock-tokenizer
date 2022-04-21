/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as database from '@bedrock/mongodb';

function isHmac(hmac) {
  hmac.should.be.an('object');
  hmac.should.have.property('id');
  hmac.id.should.be.a('string');
  hmac.should.have.property('type');
  hmac.type.should.be.a('string');
  hmac.should.have.property('algorithm');
  hmac.should.have.property('capability');
  hmac.should.have.property('invocationSigner');
  hmac.should.have.property('kmsClient');
}

export function isTokenizer(possibleTokenizer) {
  should.exist(possibleTokenizer);
  possibleTokenizer.should.be.an('object');
  possibleTokenizer.should.have.property('id');
  possibleTokenizer.id.should.be.a('string');
  possibleTokenizer.id.should.include('did:key');
  possibleTokenizer.should.have.property('hmac');
  isHmac(possibleTokenizer.hmac);
}

export async function cleanDB() {
  await database.collections['tokenizer-tokenizer'].deleteMany({});
}

export async function insertRecord({record}) {
  const collection = database.collections['tokenizer-tokenizer'];
  await collection.insertOne(record);
}
