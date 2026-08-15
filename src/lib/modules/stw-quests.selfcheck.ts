import { strict as assert } from 'node:assert';
import {
  bucketQuest,
  isAutoPinQuest,
  isSsdRewardQuest,
  mergePinnedQuestIds,
  parseCampaignQuests
} from './stw-quests-parse';

assert.equal(bucketQuest('Quest:daily_treasurechests'), 'daily');
assert.equal(bucketQuest('Quest:outpostquest_t1_l1'), 'save');
assert.equal(isAutoPinQuest('Quest:event_urn_your_keep'), true);
assert.equal(isSsdRewardQuest('Quest:outpostquest_t1_l3'), true);
assert.deepEqual(mergePinnedQuestIds(['a', 'b'], ['x', 'y'], 3), ['x', 'y', 'a']);

const quests = parseCampaignQuests({
  q1: { templateId: 'Quest:daily_safes', attributes: { quest_state: 'Active', completion_foo: 2 } },
  q2: { templateId: 'Quest:outpostquest_t2_l1', attributes: { quest_state: 'Completed' } }
} as never);

assert.equal(quests.length, 2);
assert.equal(quests[0]?.bucket, 'daily');
assert.equal(quests[1]?.bucket, 'save');

console.log('stw-quests selfcheck ok');
