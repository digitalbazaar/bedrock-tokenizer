/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from '@bedrock/core';
import * as brHttpsAgent from '@bedrock/https-agent';
import {KeystoreAgent, KmsClient} from '@digitalbazaar/webkms-client';
import {getAppIdentity} from '@bedrock/app-identity';
import {logger} from './logger.js';

const {util: {BedrockError}} = bedrock;

bedrock.events.on('bedrock.init', () => {
  if(!bedrock.config.tokenizer?.kms?.baseUrl) {
    throw new TypeError(
      '"bedrock.config.tokenizer.kms.baseUrl" config value is required.');
  }
});

/**
 * Creates a new WebKMS keystore for tokenizer use.
 *
 * @param {object} options - Options hashmap.
 * @param {string} options.controller - Keystore controller DID.
 * @param {string} [options.kmsModule] - KMS module type.
 * @param {string} [options.meterId] - Meter ID.
 * @param {string} [options.invocationSigner] - The invocation signer.
 * @param {boolean} [options.applyIpAllowList=true] - Indicates whether the
 *   configured IP allow list should be applied to the keystore or not.
 *
 * @returns {Promise<object>} Resolves to the configuration for the newly
 *   created keystore.
 */
export async function createKeystore({
  controller, kmsModule, meterId, invocationSigner,
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
  const {httpsAgent} = brHttpsAgent;
  try {
    return await KmsClient.createKeystore({
      url: `${bedrock.config.tokenizer.kms.baseUrl}/keystores`,
      config: keystoreConfig,
      invocationSigner,
      httpsAgent
    });
  } catch(cause) {
    const error = new BedrockError(
      'Error creating keystore for tokenizer.',
      'OperationError',
      {httpStatusCode: 500, public: true}, cause);
    logger.error(error.message, {error});
    throw error;
  }
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
