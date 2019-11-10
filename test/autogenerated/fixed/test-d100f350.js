const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.set(3230,true)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('Invalid index 3230', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameValue(3230)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'Invalid index 3230')
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
// @FUZZ_SIGNATURE d100f3506d057d1bbf33ec443c95a7f5aadd17205bf5e9afad28b560c99ef4cf
