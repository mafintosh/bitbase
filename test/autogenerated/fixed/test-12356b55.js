const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.fill(6045,32191,true)
  await op.fill(23650,31955,false)
  await op.fill(31935,32541,false)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('"Invalid start 31670"', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIteration(0)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, '"Invalid start 31670"')
    }
    t.end()
  })
}

const config = {
 "seed": "fuzzing-",
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
 },
 "seedNumber": 243
}

module.exports = {
  runTests,
  getObjects,
  config,
}
if (require.main && !process.env['FUZZ_DISABLE_TEST']) {
  runTests()
}

// Warning: Do not modify the signature below! It is used to deduplicate fuzz tests.
// @FUZZ_SIGNATURE 12356b55a93db7cfcad8d29cb8cc92162861c62952cb73e1b15d567785500dc3
// @FUZZ_TIMESTAMP Wed Nov 13 2019 21:04:53 GMT+0100 (Central European Standard Time)