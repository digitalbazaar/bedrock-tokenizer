/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';
import * as brHttpsAgent from 'bedrock-https-agent';
import {
  AsymmetricKey,
  Hmac,
  Kek,
  KeystoreAgent,
  KeyAgreementKey,
  KmsClient
} from '@digitalbazaar/webkms-client';

export async function createKeystore({
  controller, kmsModule, meterId, meterCapabilityInvocationSigner,
  referenceId, applyIpAllowList = true
} = {}) {
  // use default KMS module if not provided
  if(!kmsModule) {
    kmsModule = bedrock.config.tokenizer.kms.defaultKmsModule;
  }
  // use configured meter ID if not provided
  if(!meterId) {
    meterId = bedrock.config.tokenizer.kms.meterId;
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
    invocationSigner: meterCapabilityInvocationSigner,
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

export async function generateKey({type, invocationSigner, kmsClient} = {}) {
  let Class;
  let suiteContextUrl;
  if(type === 'hmac' || type === 'Sha256HmacKey2019') {
    type = 'Sha256HmacKey2019';
    suiteContextUrl = 'https://w3id.org/security/suites/hmac-2019/v1';
    Class = Hmac;
  } else if(type === 'kek' || type === 'AesKeyWrappingKey2019') {
    type = 'AesKeyWrappingKey2019';
    suiteContextUrl = 'https://w3id.org/security/suites/aes-2019/v1';
    Class = Kek;
  } else if(type === 'Ed25519VerificationKey2018') {
    type = 'Ed25519VerificationKey2018';
    suiteContextUrl = 'https://w3id.org/security/suites/ed25519-2018/v1';
    Class = AsymmetricKey;
  } else if(type === 'Ed25519VerificationKey2020') {
    type = 'Ed25519VerificationKey2020';
    suiteContextUrl = 'https://w3id.org/security/suites/ed25519-2020/v1';
    Class = AsymmetricKey;
  } else if(type === 'keyAgreement' || type === 'X25519KeyAgreementKey2019') {
    type = 'X25519KeyAgreementKey2019';
    suiteContextUrl = 'https://w3id.org/security/suites/x25519-2019/v1';
    Class = KeyAgreementKey;
  } else if(type === 'keyAgreement' || type === 'X25519KeyAgreementKey2020') {
    type = 'X25519KeyAgreementKey2020';
    suiteContextUrl = 'https://w3id.org/security/suites/x25519-2020/v1';
    Class = KeyAgreementKey;
  } else {
    throw new Error(`Unknown key type "${type}".`);
  }

  const keyDescription = await kmsClient.generateKey(
    {type, suiteContextUrl, invocationSigner});
  const {id} = keyDescription;
  return new Class({id, type, invocationSigner, kmsClient, keyDescription});
}
