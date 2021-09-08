/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';
import * as brHttpsAgent from 'bedrock-https-agent';
import {getAppIdentity} from 'bedrock-app-identity';
import {KeystoreAgent, KmsClient} from '@digitalbazaar/webkms-client';

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
  return KmsClient.createKeystore({
    url: `${bedrock.config.tokenizer.kms.baseUrl}/keystores`,
    config: keystoreConfig,
    invocationSigner,
    httpsAgent
  });
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
