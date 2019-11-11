const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.fill(15399,23875,true)
  await op.fill(18429,31256,false)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('Invalid start 17408', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIteration(0)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'Invalid start 17408')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "bitbase17",
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
// @FUZZ_SIGNATURE 44bc13de189cab7646d6a1cdce3752f1792b4320a89ef7e2cebe7e59513904c4
