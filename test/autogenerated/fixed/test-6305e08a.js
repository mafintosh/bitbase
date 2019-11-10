const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.fill(15011,25902,true)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('Invalid index 25643', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameValue(25643)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'Invalid index 25643')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "bitbase",
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
  }
 }
},
}
if (require.main && !process.env['FUZZ_DISABLE_TEST']) {
  runTests()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE 6305e08a92a182aa37033ce482f2b8e46bb29bc38f6af42ee333e30511a8fc78
