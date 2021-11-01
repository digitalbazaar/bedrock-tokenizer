/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {requireUncached, cleanDB, insertRecord} = require('./helpers');
const {tokenizers} = requireUncached('bedrock-tokenizer');
const {mockRecord} = require('./mock.data.js');

describe('Tokenizer Database Methods', function() {
  describe('Find Methods', function() {
    beforeEach(async () => {
      await cleanDB();
    });
    it(`is properly indexed for 'id' parameter`, async function() {
      const record = mockRecord;
      await insertRecord({record});

      const {id} = record.tokenizer;
      const {executionStats} = await tokenizers.get({id, explain: true});
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionTimeMillis.should.equal(0);
      executionStats.executionStages.inputStage.inputStage.stage.should
        .equal('IXSCAN');
    });
    it(`is properly indexed for 'current' parameter`, async function() {
      await tokenizers._createTokenizer();
      const {executionStats} = await tokenizers._readCurrentTokenizerRecord({
        explain: true
      });
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionTimeMillis.should.equal(0);
      executionStats.executionStages.inputStage.inputStage.stage.should
        .equal('IXSCAN');
    });
    it(`No documents are returned when 'id' parameter is not found`,
      async function() {
        const id = '1234';
        const {executionStats} = await tokenizers.get({id, explain: true});
        executionStats.nReturned.should.equal(0);
        executionStats.totalKeysExamined.should.equal(0);
        executionStats.totalDocsExamined.should.equal(0);
        executionStats.executionTimeMillis.should.equal(0);
        executionStats.executionStages.inputStage.inputStage.stage.should
          .equal('IXSCAN');
      });
    it(`No documents are returned when 'current' parameter is not found`,
      async function() {
        const {executionStats} = await tokenizers._readCurrentTokenizerRecord({
          explain: true
        });
        executionStats.nReturned.should.equal(0);
        executionStats.totalKeysExamined.should.equal(0);
        executionStats.totalDocsExamined.should.equal(0);
        executionStats.executionTimeMillis.should.equal(0);
        executionStats.executionStages.inputStage.inputStage.stage.should
          .equal('IXSCAN');
      });
  });
  describe('Update Methods', function() {
    beforeEach(async () => {
      await cleanDB();
    });
    it(`is properly indexed for 'state' parameter`, async function() {
      const record = mockRecord;
      record.tokenizer.state = 'ready';
      await insertRecord({record});

      const {executionStats} = await tokenizers._markTokenizerAsCurrent({
        explain: true
      });
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionTimeMillis.should.equal(0);
      executionStats.executionStages.inputStage.inputStage.stage.should
        .equal('IXSCAN');
    });
    it(`is properly indexed for compound query of 'id' and 'state'`,
      async function() {
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
        const {executionStats} = await tokenizers._addKeystoreAndHmacKeys({
          tokenizer, keystore, key, explain: true
        });
        executionStats.nReturned.should.equal(1);
        executionStats.totalKeysExamined.should.equal(1);
        executionStats.totalDocsExamined.should.equal(1);
        executionStats.executionTimeMillis.should.equal(0);
        executionStats.executionStages.inputStage.inputStage.stage.should
          .equal('IXSCAN');
      });
    it(`No documents are returned when 'state' parameter is not found`,
      async function() {
        const record = mockRecord;
        record.tokenizer.state = 'notfound';
        await insertRecord({record});

        const {executionStats} = await tokenizers._markTokenizerAsCurrent({
          explain: true
        });
        executionStats.nReturned.should.equal(0);
        executionStats.totalKeysExamined.should.equal(0);
        executionStats.totalDocsExamined.should.equal(0);
        executionStats.executionTimeMillis.should.equal(0);
        executionStats.executionStages.inputStage.inputStage.stage.should
          .equal('IXSCAN');
      });
  });
});
