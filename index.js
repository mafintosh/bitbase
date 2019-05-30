const Nanoresource = require('nanoresource')

const FACTOR = 32768
// const MAX_BITS = 64
const STEPS = new Array(4) // Math.ceil(MAX_BITS / Math.log2(FACTOR)))

STEPS[0] = 0
for (let i = 1; i < STEPS.length; i++) {
  const n = FACTOR * STEPS[i - 1] + 1
  STEPS[i] = n
}

const LEAF_SIZE = 4096 + 128 + 4 + 128 + 4
const NODE_SIZE = 4096 + 128 + 4 + 4096 + 128 + 4

class Node {
  constructor (x, y, index, storage) {
    this.x = x
    this.y = y
    this.index = index
    this.storage = storage
    this.allOne = null
    this.oneOne = null
    this.buffer = null
    this.dirty = false
  }

  load (cb) {
    if (this.buffer) return cb(null, this)
    // const size = 4096 + 128 + 4 + 4096 + 128 + 4
    const size = this.y === 0 ? LEAF_SIZE : NODE_SIZE
    this.storage.read(this.byteOffset(), size, (err, buf) => {
      if (err) buf = Buffer.alloc(size)
      // if (err) return cb(err)
      if (this.allOne === null) this.onload(buf)
      cb(null, this)
    })
  }

  byteOffset () {
    const leaves = this.x === 0 && this.y !== 0
      ? Math.pow(FACTOR, this.y - 1)
      : Math.pow(FACTOR, this.y) * this.x

    return LEAF_SIZE * leaves + NODE_SIZE * (this.index - leaves)
  }

  save (cb) {
    this.dirty = false
    this.storage.write(this.byteOffset(), this.buffer, cb)
  }

  onload (buf) {
    this.buffer = buf

    if (this.y === 0) {
      this.oneOne = [
        new Uint32Array(buf.buffer, buf.byteOffset, 1024),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096, 32),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128, 1)
      ]

      const cpy = Buffer.concat([ buf.slice(0, 4096) ])

      this.allOne = [
        new Uint32Array(cpy.buffer, cpy.byteOffset, 1024),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128 + 4, 32),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128 + 4 + 128, 1)
      ]
    } else {
      this.oneOne = [
        new Uint32Array(buf.buffer, buf.byteOffset, 1024),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096, 32),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128, 1)
      ]

      this.allOne = [
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128 + 4, 1024),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128 + 4 + 4096, 32),
        new Uint32Array(buf.buffer, buf.byteOffset + 4096 + 128 + 4 + 4096 + 128, 1)
      ]
    }
  }

  updateOneOne (b, upd) {
    for (let i = 0; i < 3; i++) {
      let r = b & 31
      let prev = this.oneOne[i][b >>>= 5]

      this.oneOne[i][b] = upd !== 0
        ? (prev | (0x80000000 >>> r))
        : (prev & ~(0x80000000 >>> r))

      upd = this.oneOne[i][b]
      if (upd === prev) return false
      this.dirty = true
    }

    return upd !== 0
  }

  updateAllOne (b, upd) {
    for (let i = 0; i < 3; i++) {
      let r = b & 31
      let prev = this.allOne[i][b >>>= 5]

      this.allOne[i][b] = upd === 0xffffffff
        ? (prev | (0x80000000 >>> r))
        : (prev & ~(0x80000000 >>> r))

      upd = this.allOne[i][b]
      if (upd === prev) return false
      this.dirty = true
    }

    return upd === 0xffffffff
  }

  last () {
    let n = 31 - ctz32(this.oneOne[2][0])
    if (n === -1) return -1
    n = 32 * n + (31 - ctz32(this.oneOne[1][n]))
    return 32 * n + (31 - ctz32(this.oneOne[0][n]))
  }

  first () {
    let n = Math.clz32(this.oneOne[2][0])
    if (n === 32) return -1
    n = 32 * n + Math.clz32(this.oneOne[1][n])
    return 32 * n + Math.clz32(this.oneOne[0][n])
  }

  child (n) {
    return new Node(this.x * FACTOR + n, this.y - 1, this.childIndex(n), this.storage)
  }

  childIndex (n) {
    if (this.x !== 0) return this.index + 1 + n * STEPS[this.y]
    if (n === 0) return STEPS[this.y - 1]
    return this.index + 1 + (n - 1) * STEPS[this.y]
  }
}

module.exports = class Bits extends Nanoresource {
  constructor (storage) {
    super()
    this.storage = storage
    this.root = new Node(0, 0, STEPS[0], storage)
    this.length = FACTOR

    this._path = new Uint16Array(5)
    this._offsets = new Uint16Array(this._path.buffer, this._path.byteOffset + 2, 4)
    this._cache = new Map()
  }

  _grow () {
    this.length *= 32768
    this.root = new Node(0, this.root.y + 1, STEPS[this.root.y + 1], this.storage)
  }

  _growAndSet (i, bit, cb) {
    const old = this.root

    this._grow()
    this.root.onload(Buffer.alloc(NODE_SIZE)) // y > 0 always here
    this.root.updateOneOne(0, old.oneOne[2][0])
    this.root.updateAllOne(0, old.allOne[2][0])

    this.root.save((err) => {
      if (err) return cb(err)
      this.set(i, bit, cb)
    })
  }

  _open (cb) {
    this.storage.stat((err, st) => {
      if (err) return this.root.load(cb)

      const size = 4096 + 128 + 4 + 4096 + 128 + 4
      const maxIndex = st.size / size
      while (STEPS[this.root.y + 1] < maxIndex) {
        this._grow()
      }

      this.root.load(cb)
    })
  }

  first (cb) {
    this.open(err => {
      if (err) return cb(err)

      let factor = Math.pow(32768, this.root.y)
      let offset = 0

      visit(null, this.root)

      function visit (err, node) {
        if (err) return cb(err)
        const n = node.first()
        if (n === -1) return cb(null, -1)
        if (node.y === 0) return cb(null, offset + n)
        offset += factor * n
        factor /= 32768
        node.child(n).load(visit)
      }
    })
  }

  last (cb) {
    this.open(err => {
      if (err) return cb(err)

      let factor = Math.pow(32768, this.root.y)
      let offset = 0

      visit(null, this.root)

      function visit (err, node) {
        if (err) return cb(err)
        const n = node.last()
        if (n === -1) return cb(null, -1)
        if (node.y === 0) return cb(null, offset + n)
        offset += factor * n
        factor /= 32768
        node.child(n).load(visit)
      }
    })
  }

  set (index, bit, cb) {
    this.open(err => {
      if (err) return cb(err)

      const path = new Uint16Array(4)
      factor(index, path)
      if (index >= this.length && bit) {
        this._growAndSet(index, bit, cb)
        return
      }

      const parents = new Array(path.length)

      parents[this.root.y] = this.root
      for (let y = this.root.y - 1; y >= 0; y--) {
        parents[y] = parents[y + 1].child(path[y + 1])
      }

      let missing = this.root.y + 1
      const len = missing
      for (let i = 0; i < len; i++) parents[i].load(ondone)

      function ondone (err) {
        if (err) throw err
        if (--missing) return

        for (let i = 0; i < len; i++) {
          if (!parents[i].updateOneOne(path[i], bit ? 1 : 0)) break
        }
        for (let i = 0; i < len; i++) {
          if (!parents[i].updateAllOne(path[i], bit ? 0xffffffff : 0)) break
        }

        missing = 1
        for (let i = 0; i < len; i++) {
          if (!parents[i].dirty) break
          missing++
          parents[i].save(done)
        }
        done(null)

        function done (err) {
          if (err) throw err
          if (!--missing) cb(null)
        }
      }
    })
  }

  get (index, cb) {
    this.open(err => {
      if (err) return cb(err)

      if (index >= this.length) return cb(null, false)

      const path = new Uint16Array(4)
      factor(index, path)

      this.root.load(loop)

      function loop (err, node) {
        if (err) return cb(err)

        const i = path[node.y]
        const r = 0x80000000 >>> (i & 31)
        const b = i >>> 5

        if ((node.allOne[0][b] & r) !== 0) {
          return cb(null, true)
        }

        if ((node.oneOne[0][b] & r) === 0) {
          // console.log(node.oneOne[0][b], node.oneOne[0], b)
          return cb(null, false)
        }

        node.child(path[node.y]).load(loop)
      }
    })
  }
}

function factor (n, out) {
  n = (n - (out[0] = (n & 32767))) / 32768
  n = (n - (out[1] = (n & 32767))) / 32768
  out[3] = ((n - (out[2] = (n & 32767))) / 32768) & 32767
}

function ctz32 (v) {
  let c = 32
  v &= -v
  if (v) c--
  if (v & 0x0000FFFF) c -= 16
  if (v & 0x00FF00FF) c -= 8
  if (v & 0x0F0F0F0F) c -= 4
  if (v & 0x33333333) c -= 2
  if (v & 0x55555555) c -= 1
  return c
}
