module.exports = {
  seed: 'bitbase',
  numIterations: 10000,
  numOperations: 100,
  shortening: {
    iterations: 1e6
  },
  inputs: {
  },
  operations: {
    set: {
      enabled: true,
      weight: 2
    },
    fill: {
      enabled: true,
      weight: 4
    }
  },
  validation: {
    randomIndices: {
      enabled: true,
      indices: 2000
    }
  }
}
