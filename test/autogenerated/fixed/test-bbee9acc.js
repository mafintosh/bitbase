const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.fill(738,738,true)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('Invalid start 0', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIteration(0)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, 'Invalid start 0')
    }
    t.end()
  })
}

module.exports = {
  runTests,
  getObjects,
  config: {
 "seed": "bitbase700",
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
// @FUZZ_SIGNATURE bbee9acca6a1a20cb63ce4148ff575ae7462938a922df67e7c479da73d49e260
