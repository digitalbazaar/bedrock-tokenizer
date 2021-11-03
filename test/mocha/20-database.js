/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {requireUncached, cleanDB, insertRecord} = require('./helpers');
const {tokenizers} = requireUncached('bedrock-tokenizer');
const {mockRecord} = require('./mock.data.js');

describe('Tokenizer Database Tests', function() {
  describe('Indexes', function() {
    beforeEach(async () => {
      await cleanDB();
    });
    it(`is properly indexed for 'tokenizer.id' in get()`, async function() {
      const record = mockRecord;
      await insertRecord({record});

      const {id} = record.tokenizer;
      const {executionStats} = await tokenizers.get({id, explain: true});
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionStages.inputStage.inputStage.inputStage.stage
        .should.equal('IXSCAN');
    });
    it(`is properly indexed for 'tokenizer.current' in ` +
    '_readCurrentTokenizerRecord()',
    async function() {
      await tokenizers._createTokenizer();
      const {executionStats} = await tokenizers._readCurrentTokenizerRecord({
        explain: true
      });
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionStages.inputStage.inputStage.inputStage.stage
        .should.equal('IXSCAN');
    });
    it(`is properly indexed for 'tokenizer.state' in deprecateCurrent()`,
      async function() {
        const record = mockRecord;
        record.tokenizer.state = 'current';
        await insertRecord({record});

        const {executionStats} = await tokenizers.deprecateCurrent({
          explain: true
        });
        executionStats.nReturned.should.equal(1);
        executionStats.totalKeysExamined.should.equal(1);
        executionStats.totalDocsExamined.should.equal(1);
        executionStats.executionStages.inputStage.inputStage.stage
          .should.equal('IXSCAN');
      });
    it(`is properly indexed for 'tokenizer.state' in _markTokenizerAsCurrent`,
      async function() {
        const record = mockRecord;
        record.tokenizer.state = 'ready';
        await insertRecord({record});

        const {executionStats} = await tokenizers._markTokenizerAsCurrent({
          explain: true
        });
        executionStats.nReturned.should.equal(1);
        executionStats.totalKeysExamined.should.equal(1);
        executionStats.totalDocsExamined.should.equal(1);
        executionStats.executionStages.inputStage.inputStage.stage.should
          .equal('IXSCAN');
      });
    it(`is properly indexed for compound query of 'tokenizer.id' and ` +
    `'tokenizer.state' in _readyTokenizer()`, async function() {
      const record = mockRecord;
      record.tokenizer.state = 'pending';
      await insertRecord({record});

      const {tokenizer} = record;
      const keystore = {
        id: '4321'
      };
      const key = {
        id: '1234',
        type: 'test'
      };
      const {executionStats} = await tokenizers._readyTokenizer({
        tokenizer, keystore, key, explain: true
      });
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionStages.inputStage.inputStage.stage.should
        .equal('IXSCAN');
    });
  });
});
