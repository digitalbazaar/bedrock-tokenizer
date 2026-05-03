/*!
 * Copyright (c) 2020-2026 Digital Bazaar, Inc.
 */
import {config} from '@bedrock/core';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import '@bedrock/https-agent';
import '@bedrock/mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config.mocha.tests.push(path.join(__dirname, 'mocha'));

// mongodb config
config.mongodb.name = 'bedrock_tokenizer_test';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
// drop all collections on initialization
config.mongodb.dropCollections = {};
config.mongodb.dropCollections.onInit = true;
config.mongodb.dropCollections.collections = [];

// HTTPS Agent
config['https-agent'].rejectUnauthorized = false;

config.tokenizer.kms.ipAllowList = ['127.0.0.1/32', '::1/128'];

config.tokenizer.tokenizerRecordEncryption = {
  currentKekId: 'urn:test:aes256',
  keks: [{
    id: 'urn:test:aes256',
    secretKeyMultibase: 'uogH3ERq9FRYOV8IuUiD2gKZs_qN6SLU-6RtbBUfzqQwGdg'
  }]
};
