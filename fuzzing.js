const Bitbase = require('./')

module.exports = { setup, operations, validation }

class Reference {
  constructor () {
    this.trues = []
  }

  set (i, val) {
    this.trues[i] = val
  }

  get (i) {
    return !!this.trues[i]
  }

  fill (start, end, val) {
    for (; start < end; start++) {
      this.set(start, val)
    }
  }

  indexOf (i) {
    for (; i < this.trues.length; i++) {
      if (this.trues[i]) return i
    }
    return -1
  }
}

function setup () {
  return {
    reference: new Reference(),
    actual: Bitbase.alloc(),
    state: null
  }
}

function operations (reference, actual, rng, opts = {}) {
  return {
    set: {
      inputs () {
        const i = rng(32768)
        const val = rng(2) === 0
        return [i, val]
      },
      operation (i, val) {
        actual.set(i, val)
        reference.set(i, val)
      }
    },
    fill: {
      inputs () {
        const start = rng(32768)
        const end = rng(32768)
        const val = rng(2) === 0
        return [start, end, val]
      },
      operation (start, end, bool) {
        actual.fill(start, end, bool)
        reference.fill(start, end, bool)
      }
    }
  }
}

function validation (reference, actual, rng, opts = {}) {
  return {
    tests: {
      sameValue (i) {
        if (actual.get(i) !== reference.get(i)) {
          throw new Error('Invalid index ' + i)
        }
      },
      sameIteration (start) {
        while (true) {
          const a = actual.indexOf(start)
          const b = reference.indexOf(start)

          if (a !== b) {
            throw new Error('Invalid start ' + start)
          }

          if (b === -1) return

          start = b + 1
        }
      }
    },
    validators: {
      randomIndices: {
        test: 'sameValue',
        operation (test) {
          for (let i = 0; i < opts.validation.randomIndices.indices; i++) {
            const index = rng(32768)
            test(index)
          }
        }
      },
      randomIteration: {
        test: 'sameIteration',
        operation (test) {
          test(0)
          for (let i = 0; i < opts.validation.randomIteration.starts; i++) {
            const index = rng(32768)
            test(index)
          }
        }
      }
    }
  }
}
