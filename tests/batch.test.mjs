import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv, jobsFromCsv, jobsFromJson} from '../packages/core/batch.mjs';

test('parseCsv supports commas and escaped quotes', () => {
  assert.deepEqual(parseCsv('a,b\n"x,y","say ""hi"""\n'), [['a','b'],['x,y','say "hi"']]);
});

test('jobsFromCsv maps the documented columns', () => {
  const jobs = jobsFromCsv('template_id,engine,output_format,priority,max_attempts,variables_json\ndemo-card,mock,json,5,3,"{""headline"":""Hello""}"\n');
  assert.equal(jobs[0].templateId, 'demo-card');
  assert.equal(jobs[0].variables.headline, 'Hello');
  assert.equal(jobs[0].priority, 5);
});

test('jobsFromJson accepts object with jobs', () => {
  const jobs = jobsFromJson(JSON.stringify({jobs:[{templateId:'demo-card',variables:{headline:'A'}}]}));
  assert.equal(jobs.length, 1);
});
