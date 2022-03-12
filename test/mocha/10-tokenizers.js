/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {requireUncached, isTokenizer} = require('./helpers');
const {tokenizers} = requireUncached('bedrock-tokenizer');

describe('Tokenizers', function() {
  it('should getCurrent tokenizer when none is cached', async function() {
    const tokenizer = await tokenizers.getCurrent();
    isTokenizer(tokenizer);
  });
  it('should get same tokenizer when one is cached', async function() {
    const tokenizer = await tokenizers.getCurrent();
    isTokenizer(tokenizer);
    const cachedTokenizer = await tokenizers.getCurrent();
    isTokenizer(cachedTokenizer);
    tokenizer.should.deep.equal(cachedTokenizer);
  });
  it('should get tokenizer by id', async function() {
    const tokenizer = await tokenizers.getCurrent();
    isTokenizer(tokenizer);
    const {id} = tokenizer;
    const databaseTokenizer = await tokenizers.get({id});
    isTokenizer(databaseTokenizer);
    tokenizer.id.should.equal(databaseTokenizer.id);
    const {hmac} = tokenizer;
    hmac.id.should.equal(databaseTokenizer.hmac.id);
    hmac.type.should.equal(databaseTokenizer.hmac.type);
    hmac.algorithm.should.equal(databaseTokenizer.hmac.algorithm);
    hmac.invocationSigner.id.should.equal(
      databaseTokenizer.hmac.invocationSigner.id);
    hmac.kmsClient.keystoreId.should.equal(
      databaseTokenizer.hmac.kmsClient.keystoreId);
  });
});
