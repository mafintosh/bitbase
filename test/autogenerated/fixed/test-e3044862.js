const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.fill(1074,25835,true)
  await op.fill(11788,15691,false)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('Invalid start 4096', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIteration(0)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'Invalid start 4096')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "bitbase1",
 "numIterations": 10000,
 "numOperations": 100,
 "shortening": {
  "iterations": 1000000
 },
 "inputs": {},
 "operations": {
  "set": {
   "enabled": true,
   "weight": 2
  },
  "fill": {
   "enabled": true,
   "weight": 4
  }
 },
 "validation": {
  "randomIndices": {
   "enabled": true,
   "indices": 2000
  },
  "randomIteration": {
   "enabled": true,
   "indices": 10
  }
 }
},
}
if (require.main && !process.env['FUZZ_DISABLE_TEST']) {
  runTests()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE e30448623af70c86c0a1656cb994d1624cadfcb9d9b4477340dbcf8b444b36b3
