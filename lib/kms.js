/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';
import * as brHttpsAgent from 'bedrock-https-agent';
import {
  KeystoreAgent,
  KmsClient
} from '@digitalbazaar/webkms-client';

export async function createKeystore({capabilityAgent, referenceId} = {}) {
  const {kmsBaseUrl} = bedrock.config.tokenizer;
  // create keystore
  const config = {
    sequence: 0,
    controller: capabilityAgent.id
  };
  if(referenceId) {
    config.referenceId = referenceId;
  }
  const {httpsAgent} = brHttpsAgent;
  return KmsClient.createKeystore({
    url: `${kmsBaseUrl}/keystores`,
    config,
    httpsAgent
  });
}

export async function getKeystore({id} = {}) {
  const {httpsAgent} = brHttpsAgent;
  return KmsClient.getKeystore({id, httpsAgent});
}

export function getKeystoreAgent({capabilityAgent, keystore} = {}) {
  const {httpsAgent} = brHttpsAgent;
  const kmsClient = new KmsClient({keystore, httpsAgent});
  const keystoreAgent = new KeystoreAgent(
    {keystore, capabilityAgent, kmsClient});
  return keystoreAgent;
}
