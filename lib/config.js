/*
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';

const {config} = bedrock;
const c = bedrock.util.config.main;
const cc = c.computer();

config.tokenizer = {};
config.tokenizer.kms = {};

// example: https://example.com/kms
config.tokenizer.kms.baseUrl = '';

// ipAllowList is added to keystores that should only be accessible from
// specific applications operating on trusted IP addresses
config.tokenizer.kms.ipAllowList = [];

// default KMS module to use
config.tokenizer.kms.defaultKmsModule = 'ssm-v1';

// meter usage id to be used with the KMS
config.tokenizer.kms.meterId = '';

// default WebKMS base URL -- modify as needed for production systems where the
// expectation is that the WebKMS runs on a different system from the system
// running `bedrock-tokenizer` (note that this doesn't necessarily mean that
// the systems won't use the same external domain)
cc('tokenizer.kms.baseUrl', () => `${config.server.baseUri}/kms`);
