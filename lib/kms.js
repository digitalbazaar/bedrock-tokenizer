/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from '@bedrock/core';
import * as brHttpsAgent from '@bedrock/https-agent';
import {createRequire} from 'module';
import {getAppIdentity} from '@bedrock/app-identity';
import {logger} from './logger.js';
const require = createRequire(import.meta.url);
const {KeystoreAgent, KmsClient} = require('@digitalbazaar/webkms-client');

const {util: {BedrockError}} = bedrock;

bedrock.events.on('bedrock.init', () => {
  if(!(bedrock.config && bedrock.config.tokenizer &&
    bedrock.config.tokenizer.kms && bedrock.config.tokenizer.kms.baseUrl)) {
    throw new TypeError(
      '"bedrock.config.tokenizer.kms.baseUrl" config value is required.');
  }
});

/**
 * Creates a new WebKMS keystore for tokenizer use.
 * Requires bedrock.config.tokenizer.kms.baseUrl to be set.
 *
 * @param {object} options - Options hashmap.
 * @param {string} options.controller - Keystore controller DID.
 * @param {string} [options.kmsModule] - KMS module type.
 * @param {string} [options.meterId] - Meter ID.
 * @param {string} [options.invocationSigner]
 * @param {string} [options.referenceId]
 * @param {boolean} [options.applyIpAllowList=true]
 *
 * @return {Promise<object>} Resolves to the configuration for the newly
 *   created keystore.
 */
export async function createKeystore({
  controller, kmsModule, meterId, invocationSigner, referenceId,
  applyIpAllowList = true
} = {}) {
  // use default KMS module if not provided
  if(!kmsModule) {
    kmsModule = bedrock.config.tokenizer.kms.defaultKmsModule;
  }
  // use configured meter ID if not provided
  if(!meterId) {
    meterId = bedrock.config.tokenizer.kms.meterId;
  }
  // use application's identity to sign request bound to its meter
  if(!invocationSigner) {
    const {keys: {capabilityInvocationKey}} = getAppIdentity();
    invocationSigner = capabilityInvocationKey.signer();
  }
  // create keystore
  const keystoreConfig = {
    sequence: 0,
    controller,
    kmsModule,
    meterId
  };
  if(applyIpAllowList) {
    keystoreConfig.ipAllowList = bedrock.config.tokenizer.kms.ipAllowList;
  }
  if(referenceId) {
    keystoreConfig.referenceId = referenceId;
  }
  const {httpsAgent} = brHttpsAgent;
  let result;
  try {
    result = await KmsClient.createKeystore({
      url: `${bedrock.config.tokenizer.kms.baseUrl}/keystores`,
      config: keystoreConfig,
      invocationSigner,
      httpsAgent
    });
  } catch(cause) {
    const error = new BedrockError(
      'Error creating keystore for tokenizer.', 'UnknownError',
      {httpStatusCode: 500, public: true}, cause);
    logger.error(error);
    throw error;
  }
  return result;
}

export async function getKeystore({id, capability, invocationSigner} = {}) {
  const {httpsAgent} = brHttpsAgent;
  const kmsClient = new KmsClient({keystoreId: id, httpsAgent});
  return kmsClient.getKeystore({capability, invocationSigner});
}

export function getKeystoreAgent({capabilityAgent, keystoreId} = {}) {
  const {httpsAgent} = brHttpsAgent;
  const kmsClient = new KmsClient({keystoreId, httpsAgent});
  const keystoreAgent = new KeystoreAgent(
    {keystoreId, capabilityAgent, kmsClient});
  return keystoreAgent;
}
