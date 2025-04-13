/*!
 * Copyright (c) 2020-2025 Digital Bazaar, Inc. All rights reserved.
 */
import {cleanDB, insertRecord} from './helpers.js';
import {mockRecord, mockRecord2} from './mock.data.js';
import {tokenizers} from '@bedrock/tokenizer';

describe('Tokenizer Database Tests', function() {
  describe('Indexes', function() {
    beforeEach(async () => {
      await cleanDB();

      // second record is inserted here in order to do proper assertions for
      // 'nReturned', 'totalKeysExamined' and 'totalDocsExamined'.
      await insertRecord({record: mockRecord2});
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
      executionStats.executionStages.inputStage.inputStage.inputStage.keyPattern
        .should.eql({'tokenizer.id': 1});
    });
    it(`is properly indexed for 'tokenizer.current' in ` +
      '_readCurrentTokenizerRecord()', async function() {
      await tokenizers._createTokenizer();
      const {executionStats} = await tokenizers._readCurrentTokenizerRecord({
        explain: true
      });
      executionStats.nReturned.should.equal(1);
      executionStats.totalKeysExamined.should.equal(1);
      executionStats.totalDocsExamined.should.equal(1);
      executionStats.executionStages.inputStage.inputStage.inputStage.stage
        .should.equal('IXSCAN');
      executionStats.executionStages.inputStage.inputStage.inputStage.keyPattern
        .should.eql({'tokenizer.current': 1});
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
        const {executionStages: targetStage} = executionStats;
        // only mongodb 8+ has 'EXPRESS_IXSCAN'
        if(targetStage.stage === 'EXPRESS_IXSCAN') {
          targetStage.keyPattern.should.eql(
            '{ tokenizer.state: 1 }');
        } else {
          targetStage = executionStages.inputStage.inputStage;
          targetStage.stage.should.equal('IXSCAN');
          targetStage.keyPattern.should.eql(
            {'tokenizer.state': 1});
        }
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
        const {executionStages: targetStage} = executionStats;
        // only mongodb 8+ has 'EXPRESS_IXSCAN'
        if(targetStage.stage === 'EXPRESS_IXSCAN') {
          targetStage.keyPattern.should.eql(
            '{ tokenizer.state: 1 }');
        } else {
          targetStage = executionStages.inputStage.inputStage;
          targetStage.stage.should.equal('IXSCAN');
          targetStage.keyPattern.should.eql(
            {'tokenizer.state': 1});
        }
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
      executionStats.executionStages.inputStage.inputStage.keyPattern
        .should.eql({'tokenizer.id': 1});
    });
  });
});
