/*
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';

const {config} = bedrock;
const c = bedrock.util.config.main;
const cc = c.computer();

config.tokenizer = {};
config.tokenizer.kms = {};
config.tokenizer.kms.defaultKmsModule = 'ssm-v1';

// default WebKMS base URL -- modify as needed for production systems where the
// expectation is that the WebKMS runs on a different system from the system
// running `bedrock-tokenizer` (note that this doesn't necessarily mean that
// the systems won't use the same external domain)
cc('tokenizer.kms.baseUrl', () => `${config.server.baseUri}/kms`);
