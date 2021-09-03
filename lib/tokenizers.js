/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';
import {getAppIdentity} from 'bedrock-app-identity';
import * as database from 'bedrock-mongodb';
import {generateId} from 'bnid';
import {promisify} from 'util';
import {CapabilityAgent} from '@digitalbazaar/webkms-client';
import * as kms from './kms.js';
const {util: {BedrockError}} = bedrock;

let CACHED_TOKENIZER = null;
let AUTO_ROTATION_CHECKER = null;

bedrock.events.on('bedrock-mongodb.ready', async () => {
  await promisify(database.openCollections)(['tokenizer-tokenizer']);

  await promisify(database.createIndexes)([{
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

export async function get({id} = {}) {
  if(!(id && typeof id === 'string')) {
    throw new TypeError('"id" must be a string.');
  }

  // return cached tokenizer if available
  if(CACHED_TOKENIZER && CACHED_TOKENIZER.id === id) {
    return CACHED_TOKENIZER;
  }

  const query = {'tokenizer.id': id};
  const projection = {_id: 0};
  const collection = database.collections['tokenizer-tokenizer'];
  const record = await collection.findOne(query, projection);
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
    }
  }

  // 2. Get the current tokenizer.
  return _getCurrentTokenizer();
}

export async function deprecateCurrent() {
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
  try {
    const result = await collection.updateOne(
      query, {$set, $unset}, database.writeOptions);
    // return `true` if a tokenizer was marked as `deprecated`
    return result.result.n === 0;
  } catch(e) {
    throw e;
  }
}

/**
 * Sets a custom function to be called that indicates whether auto-rotation
 * of the current tokenizer should occur.
 *
 * @param {object} options - Options to use.
 * @param {function} options.method - The function to call to determine if
 *   auto-rotation of the current tokenizer should occur; this function
 *   should return `true` if auto-rotation should occur.
 */
export function setAutoRotationChecker(method) {
  if(typeof method !== 'function') {
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

async function _readCurrentTokenizerRecord() {
  const query = {'tokenizer.current': true};
  const projection = {_id: 0};
  const collection = database.collections['tokenizer-tokenizer'];
  const record = await collection.findOne(query, projection);
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

  // 1. Generate capability agent from handle and application identity.
  const handle = 'primary';
  const {keys: {capabilityInvocationKey}} = getAppIdentity();
  const keyPair = capabilityInvocationKey;
  const signer = capabilityInvocationKey.signer();
  const capabilityAgent = new CapabilityAgent({handle, signer, keyPair});

  // 2. Get HMAC API.
  const keystore = await kms.getKeystore(
    {id: tokenizer.keystore, invocationSigner: signer});
  const keystoreAgent = kms.getKeystoreAgent(
    {capabilityAgent, keystoreId: keystore.id});
  const hmac = await keystoreAgent.getHmac(tokenizer.hmac);

  // 3. Use tokenizer ID and hmac API to represent tokenizer.
  return {id: tokenizer.id, hmac};
}

async function _createTokenizer() {
  // 1. Get the application's identity.
  const {keys: {capabilityInvocationKey}} = getAppIdentity();
  // 2. Generate capability agent from handle and secret.
  const handle = 'primary';
  const keyPair = capabilityInvocationKey;
  const signer = capabilityInvocationKey.signer();
  const capabilityAgent = new CapabilityAgent({handle, signer, keyPair});
  // 3. Store the tokenizer record with pending state.
  const collection = database.collections['tokenizer-tokenizer'];
  const now = Date.now();
  const meta = {created: now, updated: now};
  const tokenizer = {
    id: await generateId(),
    capabilityAgent: capabilityAgent.id,
    state: 'pending'
  };
  let record = {
    meta,
    tokenizer
  };
  try {
    const result = await collection.insertOne(record, database.writeOptions);
    record = result.ops[0];
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
    controller: capabilityAgent.id,
    meterCapabilityInvocationSigner: capabilityAgent.getSigner(),
    referenceId: tokenizer.id
  });
  const keystoreAgent = kms.getKeystoreAgent(
    {capabilityAgent, keystoreId: keystore.id});
  const key = await keystoreAgent.generateKey(
    {type: 'hmac', kmsModule: bedrock.config.tokenizer.kms.defaultKmsModule});

  // 5. Add keystore and HMAC info to the tokenizer record.
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
  const result = await collection.updateOne(
    query, {$set}, database.writeOptions);
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

  // mark a tokenizer as current
  await _markTokenizerAsCurrent();
}

async function _markTokenizerAsCurrent() {
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
  try {
    const result = await collection.updateOne(
      query, {$set}, database.writeOptions);
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
