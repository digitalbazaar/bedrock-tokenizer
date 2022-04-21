/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {isTokenizer} from './helpers.js';
import {tokenizers} from '@bedrock/tokenizer';

describe('Tokenizers', function() {
  let _random;
  beforeEach(function() {
    // save proper value
    _random = Math.random;
  });
  afterEach(function() {
    // restore proper value
    Math.random = _random;
    tokenizers.setAutoRotationChecker({method: null});
  });
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
  it('should rotate tokenizer', async function() {
    // getting current tokenizer twice should yield the same tokenizer
    const tokenizer1 = await tokenizers.getCurrent();
    isTokenizer(tokenizer1);
    const tokenizer2 = await tokenizers.getCurrent();
    isTokenizer(tokenizer2);
    tokenizer1.id.should.equal(tokenizer2.id);
    // now set an auto rotater and get a different tokenizer
    tokenizers.setAutoRotationChecker({method: () => true});
    // force auto-rotation check (which only occurs a percentage of the time)
    Math.random = () => 0;
    const tokenizer3 = await tokenizers.getCurrent();
    isTokenizer(tokenizer3);
    tokenizer1.id.should.not.equal(tokenizer3.id);
  });
});
