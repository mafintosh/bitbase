module.exports = class IndexContainer {
  constructor (buffer) {
    this.bits = new Uint32Array(buffer.buffer, buffer.byteOffset, 1024)
    this.index = new Uint32Array(buffer.buffer, buffer.byteOffset + 4096, 32)
    this.top = new Uint32Array(buffer.buffer, buffer.byteOffset + 4096 + 128, 1)
  }

  static alloc () {
    return new this(Buffer.alloc(this.bytesNeeded()))
  }

  static bytesNeeded () {
    return 4228
  }

  setTrue (i) {
    const j = i >>> 5

    let prev = this.bits[j]
    this.bits[j] |= (0x80000000 >>> (i & 31))

    if (this.bits[j] === prev) return

    const k = j >> 5

    prev = this.index[k]
    this.index[k] |= (0x80000000 >>> (j & 31))
    if (this.index[k] === prev) return

    this.top[0] |= (0x80000000 >>> k)
  }

  setFalse (i) {
    const j = i >> 5
    const k = j >> 5

    this.bits[j] &= ~(0x80000000 >>> (i & 31))
    if (this.bits[j] !== 0) return
    this.index[k] &= ~(0x80000000 >>> (j & 31))
    if (this.index[k] !== 0) return
    this.top[0] &= ~(0x80000000 >>> k)
  }

  set (i, val) {
    if (val === true) return this.setTrue(i)
    return this.setFalse(i)
  }

  get (i) {
    return (this.bits[i >> 5] & (0x80000000 >>> (i & 31))) !== 0
  }

  fillTrue (start, end) {
    if (end <= start) return
    fillTrue(this.bits, start, end)
    fillTrue(this.index, start >>> 5, (end >>> 5) + ((end & 31) ? 1 : 0))
    fillTrue(this.top, start >>> 10, (end >>> 10) + ((end & 1023) ? 1 : 0))
  }

  fillFalse (start, end) {
    if (start >= end) return

    let sm = ~(0xffffffff >>> (start & 31))
    let em = (0xffffffff >>> (end & 31))
    let s = start >>> 5
    let e = end >>> 5

    if (s === e) {
      this.bits[s] &= (sm | em)
    } else {
      this.bits[s] &= sm
      this.bits.fill(0, s + 1, e)
      if (em !== 0xffffffff) this.bits[e] &= em
    }

    s = coerceFalseLeft(this.bits, s)
    e = coerceFalseRight(this.bits, e)
    if (s >= e) return

    sm = ~(0xffffffff >>> (s & 31))
    em = (0xffffffff >>> (e & 31))
    s = s >>> 5
    e = e >>> 5

    if (s === e) {
      this.index[s] &= (sm | em)
    } else {
      this.index[s] &= sm
      this.index.fill(0, s + 1, e)
      if (em !== 0xffffffff) this.index[e] &= em
    }

    s = coerceFalseLeft(this.index, s)
    e = coerceFalseRight(this.index, e)
    if (s >= e) return

    sm = ~(0xffffffff >>> (s & 31))
    em = e === 32 ? 0 : (0xffffffff >>> (e & 31))

    this.top[0] &= (sm | em)
  }

  fill (start, end, val) {
    if (val === true) return this.fillTrue(start, end)
    return this.fillFalse(start, end)
  }

  first () {
    let p = Math.clz32(this.top[0])
    if (p === 32) return -1
    p = (p << 5) | (Math.clz32(this.index[p]))
    return (p << 5) | (Math.clz32(this.bits[p]))
  }

  indexOf (i) {
    if (i === 0) return this.first()

    const j = --i >>> 5
    let p = maskify(this.bits[j], i & 0b11111)

    if (p < 32) {
      return (j << 5) | p
    }

    const k = j >>> 5
    p = maskify(this.index[k], j & 0b11111)

    if (p < 32) {
      const tmp = (k << 5) | p
      return (tmp << 5) | Math.clz32(this.bits[tmp])
    }

    p = maskify(this.top[0], k)

    if (p < 32) {
      const tmp = (p << 5) | (Math.clz32(this.index[p]))
      return (tmp << 5) | Math.clz32(this.bits[tmp])
    }

    return -1
  }
}

function coerceFalseLeft (arr, i) {
  return arr[i] === 0 ? i : i + 1
}

function coerceFalseRight (arr, i) {
  return arr[i] === 0 ? i + 1 : i
}

function maskify (n, f) {
  return f >= 31 ? 32 : Math.clz32(n & (0x7fffffff >>> f))
}

function fillTrue (arr, start, end) {
  if (start > end) return

  const sr = start & 31
  const er = end & 31
  const sm = (0xffffffff >>> sr)
  const em = ~(0xffffffff >>> er)
  const s = start >>> 5
  const e = end >>> 5

  if (s === e) {
    arr[s] |= (sm & em)
  } else {
    arr[s] |= sm
    arr.fill(0xffffffff, s + 1, e)
    arr[e] |= em
  }
}

function fillFalse (arr, start, end) {
  if (start >= end) return [true, true]

  const s = start >>> 5
  const e = end >>> 5
  const sr = start & 31
  const er = end & 31
  const sm = ~(0xffffffff >>> sr)
  const em = (0xffffffff >>> er)

  if (s === e) {
    arr[s] &= (sm | em)
  } else {
    arr[s] &= sm
    arr.fill(0, s + 1, e)
    arr[e] &= em
  }
}
