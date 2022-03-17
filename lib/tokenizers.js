/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as base64url from 'base64url-universal';
import * as bedrock from 'bedrock';
import * as database from 'bedrock-mongodb';
import * as kms from './kms.js';
import {adaptHmac} from './hmacAdapter.js';
import {CapabilityAgent} from '@digitalbazaar/webkms-client';
import {promisify} from 'util';
import {randomBytes} from 'crypto';
const {util: {BedrockError}} = bedrock;
const randomBytesAsync = promisify(randomBytes);

let CACHED_TOKENIZER = null;
let AUTO_ROTATION_CHECKER = null;

bedrock.events.on('bedrock-mongodb.ready', async () => {
  await database.openCollections(['tokenizer-tokenizer']);

  await database.createIndexes([{
    collection: 'tokenizer-tokenizer',
    fields: {'tokenizer.id': 1},
    options: {unique: true, background: false}
  }, {
    collection: 'tokenizer-tokenizer',
    fields: {'tokenizer.state': 1},
    options: {unique: false, background: false}
  }, {
    // there can be only one current tokenizer
    collection: 'tokenizer-tokenizer',
    fields: {'tokenizer.current': 1},
    options: {
      partialFilterExpression: {'tokenizer.current': {$exists: true}},
      unique: true,
      background: false
    }
  }]);
});

export async function get({id, explain = false} = {}) {
  if(!(id && typeof id === 'string')) {
    throw new TypeError('"id" must be a string.');
  }

  // return cached tokenizer if available
  if(!explain && CACHED_TOKENIZER && CACHED_TOKENIZER.id === id) {
    return CACHED_TOKENIZER;
  }

  const query = {'tokenizer.id': id};
  const projection = {_id: 0};
  const collection = database.collections['tokenizer-tokenizer'];

  if(explain) {
    // 'find().limit(1)' is used here because 'findOne()' doesn't return a
    // cursor which allows the use of the explain function.
    const cursor = await collection.find(query, {projection}).limit(1);
    return cursor.explain('executionStats');
  }

  const record = await collection.findOne(query, {projection});
  if(!record) {
    const details = {
      httpStatusCode: 404,
      public: true
    };
    throw new BedrockError(
      'Tokenizer not found.',
      'NotFoundError', details);
  }

  return _tokenizerFromRecord({record});
}

export async function getCurrent() {
  // 1. Check to see if rotation is required...
  if(AUTO_ROTATION_CHECKER && _isRotationCheckRequired()) {
    // 1.1. Rotate tokenizer if necessary.
    const shouldRotate = await AUTO_ROTATION_CHECKER();
    if(shouldRotate) {
      await deprecateCurrent();
      // clear cached current tokenizer; note: the cached value *may* not match
      // the one that was just marked deprecated due to multiple concurrent
      // requests modifying the cached value, but this should not create
      // invalid state, rather, it just generates an extra database read
      CACHED_TOKENIZER = null;
    }
  }

  // 2. Get the current tokenizer.
  return _getCurrentTokenizer();
}

export async function deprecateCurrent({explain = false} = {}) {
  // mark the `current` tokenizer as deprecated
  const query = {
    'tokenizer.state': 'current'
  };
  const $set = {
    'meta.updated': Date.now(),
    'tokenizer.state': 'deprecated'
  };
  const $unset = {'tokenizer.current': ''};
  const collection = database.collections['tokenizer-tokenizer'];

  if(explain) {
    // 'find().limit(1)' is used here because 'updateOne()' doesn't return a
    // cursor method which allows the use of the explain function.
    const cursor = await collection.find(query).limit(1);
    return cursor.explain('executionStats');
  }

  const result = await collection.updateOne(query, {$set, $unset});
  // return `true` if a tokenizer was marked as `deprecated`
  return result.result.n === 0;
}

/**
 * Sets a custom function to be called that indicates whether auto-rotation
 * of the current tokenizer should occur.
 *
 * @param {object} options - Options to use.
 * @param {function|null} options.method - The function to call to determine if
 *   auto-rotation of the current tokenizer should occur; this function
 *   should return `true` if auto-rotation should occur; if `null` is passed
 *   then auto-rotation will be disabled.
 */
export function setAutoRotationChecker(method) {
  if(!(method === null || typeof method === 'function')) {
    throw new TypeError('"method" must be a function.');
  }
  AUTO_ROTATION_CHECKER = method;
}

function _isRotationCheckRequired() {
  // check for rotation requirements only 20% of the time
  return Math.random() <= 0.2;
}

async function _getCurrentTokenizer() {
  // 1. Get tokenizer from cache.
  if(CACHED_TOKENIZER) {
    return CACHED_TOKENIZER;
  }

  // 2. Build current tokenizer from database.
  // 2.1. While current tokenizer does not exist, try to create it.
  let record;
  while(!record) {
    // 2.1.1. Try to read the current tokenizer record.
    try {
      record = await _readCurrentTokenizerRecord();
    } catch(e) {
      if(e.name !== 'NotFoundError') {
        throw e;
      }
    }

    // 2.1.2. If tokenizer record found, break out of loop.
    if(record) {
      break;
    }

    // 2.1.3. Attempt to mark a ready tokenizer as current.
    if(await _markTokenizerAsCurrent()) {
      continue;
    }

    // 2.1.4. Attempt to create a tokenizer to be marked as current.
    await _createTokenizer();
  }

  // 3. Load current tokenizer from record.
  const tokenizer = await _tokenizerFromRecord({record});

  // 4. Cache tokenizer for faster retrieval.
  if(!CACHED_TOKENIZER) {
    CACHED_TOKENIZER = tokenizer;
  }

  // 5. Return current tokenizer.
  return tokenizer;
}

export async function _readCurrentTokenizerRecord({explain = false} = {}) {
  const query = {'tokenizer.current': true};
  const projection = {_id: 0};
  const collection = database.collections['tokenizer-tokenizer'];

  if(explain) {
    // 'find().limit(1)' is used here because 'findOne()' doesn't return a
    // cursor which allows the use of the explain function.
    const cursor = await collection.find(query, {projection}).limit(1);
    return cursor.explain('executionStats');
  }

  const record = await collection.findOne(query, {projection});
  if(!record) {
    const details = {
      httpStatusCode: 404,
      public: true
    };
    throw new BedrockError(
      'Current tokenizer not found.',
      'NotFoundError', details);
  }
  return record;
}

async function _tokenizerFromRecord({record}) {
  const {tokenizer} = record;
  // 1. Generate capability agent from handle and secret.
  const handle = 'primary';
  const secret = base64url.decode(tokenizer.secret);
  const capabilityAgent = await CapabilityAgent.fromSecret({handle, secret});

  // 2. Get HMAC API.
  const keystore = await kms.getKeystore(
    {id: tokenizer.keystore, invocationSigner: capabilityAgent.getSigner()});
  const keystoreAgent = kms.getKeystoreAgent(
    {capabilityAgent, keystoreId: keystore.id});
  const hmac = await keystoreAgent.getHmac(tokenizer.hmac);

  // 3. Augment `hmac` API to perform a local hash before sending data to
  // the WebKMS system to improve privacy.
  adaptHmac({hmac});

  // 4. Use tokenizer ID and hmac API to represent tokenizer.
  return {id: tokenizer.id, hmac};
}

export async function _createTokenizer() {
  // 1. Generate a random secret.
  const secret = await randomBytesAsync(32);
  // 2. Generate capability agent from handle and secret.
  const handle = 'primary';
  const capabilityAgent = await CapabilityAgent.fromSecret({handle, secret});
  // 3. Store the tokenizer record with pending state.
  const collection = database.collections['tokenizer-tokenizer'];
  const now = Date.now();
  const meta = {created: now, updated: now};
  const tokenizer = {
    id: capabilityAgent.id,
    secret: base64url.encode(secret),
    state: 'pending'
  };
  const record = {
    meta,
    tokenizer
  };
  try {
    await collection.insertOne(record);
  } catch(e) {
    if(!database.isDuplicateError(e)) {
      throw e;
    }
    throw new BedrockError(
      'Duplicate tokenizer.',
      'DuplicateError', {
        public: true,
        httpStatusCode: 409
      }, e);
  }

  // 4. Create a keystore and HMAC key for the tokenizer.
  const keystore = await kms.createKeystore({
    controller: capabilityAgent.id, referenceId: 'primary'
  });
  const keystoreAgent = kms.getKeystoreAgent(
    {capabilityAgent, keystoreId: keystore.id});
  const key = await keystoreAgent.generateKey({type: 'hmac'});

  // 5. Ready tokenizer for use by adding keystore and HMAC key to its record.
  await _readyTokenizer({tokenizer, keystore, key});

  // mark any ready tokenizer as current
  await _markTokenizerAsCurrent();
}

export async function _readyTokenizer({
  tokenizer, keystore, key, explain = false
} = {}) {
  const query = {
    'tokenizer.id': tokenizer.id,
    'tokenizer.state': 'pending'
  };
  const $set = {
    'meta.updated': Date.now(),
    'tokenizer.state': 'ready',
    'tokenizer.keystore': keystore.id,
    'tokenizer.hmac': {
      id: key.id,
      type: key.type
    }
  };
  const collection = database.collections['tokenizer-tokenizer'];

  if(explain) {
    // 'find().limit(1)' is used here because 'updateOne()' doesn't return a
    // cursor which allows the use of the explain function.
    const cursor = await collection.find(query).limit(1);
    return cursor.explain('executionStats');
  }

  const result = await collection.updateOne(query, {$set});
  if(result.result.n === 0) {
    const details = {
      tokenizer: tokenizer.id,
      httpStatusCode: 409,
      public: true
    };
    throw new BedrockError(
      'Could not update tokenizer; ' +
      'tokenizer either not found or in an unexpected state.',
      'InvalidStateError', details);
  }
}

export async function _markTokenizerAsCurrent({explain = false} = {}) {
  // mark any `ready` tokenizer as current
  const query = {
    'tokenizer.state': 'ready'
  };
  const $set = {
    'meta.updated': Date.now(),
    'tokenizer.state': 'current',
    'tokenizer.current': true
  };
  const collection = database.collections['tokenizer-tokenizer'];

  if(explain) {
    // 'find().limit(1)' is used here because 'updateOne()' doesn't return a
    // cursor which allows the use of the explain function.
    const cursor = await collection.find(query).limit(1);
    return cursor.explain('executionStats');
  }

  try {
    const result = await collection.updateOne(query, {$set});
    // return `true` if a tokenizer was marked as `current`
    return result.result.n !== 0;
  } catch(e) {
    if(!database.isDuplicateError(e)) {
      throw e;
    }
    // return true since a tokenizer was marked as `current` by another process
    return true;
  }
}
