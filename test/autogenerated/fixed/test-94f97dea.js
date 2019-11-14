const p = require('path')
const test = require('tape')
const testSetup = require('reference-fuzzer/test')

async function getObjects () {
  const testingModule = require('../../../fuzzing.js')
  const { actual, reference, state, executor: op, validators } = await testSetup(testingModule)

  await op.fill(4201,32450,true)
  await op.fill(32037,32122,false)

  return { actual, reference, state, tests: validators.tests }
}

function runTests () {
  test('"Invalid start 8830"', async t => {
    const { tests } = await getObjects()

    try {
      await tests.sameIteration(0)
      t.pass('fuzz test passed')
    } catch (err) {
      if (err.longDescription) console.error(err.longDescription)
      t.fail(err, '"Invalid start 8830"')
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
 "seedNumber": 611
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
// @FUZZ_SIGNATURE 94f97dea9533f253dca84bf6ab566c4a38e0bc538f8d2e609360e841c05b3a42
// @FUZZ_TIMESTAMP Thu Nov 14 2019 12:11:09 GMT+0100 (Central European Standard Time)