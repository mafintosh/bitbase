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

    let sr = start & 31
    let er = end & 31
    let sm = ~(0xffffffff >>> sr)
    let em = 0xffffffff >>> er
    let s = start >>> 5
    let e = end >>> 5

    if (s === e) {
      this.bits[s] &= (sm & em)
    } else {
      this.bits[s] &= sm
      this.bits.fill(0, s + 1, e)
      if (er > 0) {
        this.bits[e] &= em
        if (!this.bits[e]) {
          e++
          er = 0
        }
      }
    }

    if (e > 0 && this.bits[e - 1] > 0) e--
    if (this.bits[s] > 0) s++
    if (s >= e) return

    sr = s & 31
    er = e & 31
    sm = ~(0xffffffff >>> sr)
    em = 0xffffffff >>> er
    s = s >>> 5
    e = e >>> 5

    if (s === e) {
      this.index[s] &= (sm | em)
    } else {
      this.index[s] &= sm
      this.index.fill(0, s + 1, e)
      if (er > 0) {
        this.index[e] &= em
        if (!this.index[e]) {
          e++
          er = 0
        }
      }
    }
    if (e > 0 && this.index[e - 1] > 0)e--
    if (this.index[s] > 0) s++
    if (s >= e) return

    sm = ~(0xffffffff >>> s)
    em = e < 32 ? (0xffffffff >>> e) : 0

    this.top[0] &= (sm | em)
  }

  // TODO: this is not right when setting the index
  fillFalse_ (start, end) {
    if (end <= start) return
    const [s, e] = fillFalse(this.bits, start, end)
    if (s) start += 32
    if (e) end -= 32
    if (end < 0) return
    const [s1, e1] = fillFalse(this.index, (start >>> 5), (end >>> 5) + ((end & 31) ? 1 : 0))
    if (s1) start += 1024
    if (e1) end -= 1024
    if (end < 0) return
    fillFalse(this.top, (start >>> 10), (end >>> 10) + ((end & 1023) ? 1 : 0))
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
  if (start > end) return [true, true]

  const s = start >>> 5
  const e = end >>> 5
  const sr = start & 31
  const er = end & 31
  const sm = ~(0xffffffff >>> sr)
  const em = (0xffffffff >>> er)

  if (s === e) {
    arr[s] &= (sm | em)
    return [arr[s] > 0, arr[s] > 0]
  } else {
    const p = arr[s]
    arr[s] &= sm
    arr.fill(0, s + 1, e)
    arr[e] &= em
    return [arr[s] > 0, arr[e - (er === 0 ? 1 : 0)] > 0]
  }
}
