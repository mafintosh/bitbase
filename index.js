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

  // TODO: this is not right when setting the index
  fillTrue (start, end) {
    for (; start < end; start++) {
      this.setTrue(start)
    }
    // fillTrue(this.bits, start, end)
    // fillTrue(this.index, start >>> 5, (end >>> 5) + ((end & 31) ? 1 : 0))
    // fillTrue(this.top, start >>> 10, (end >>> 10) + ((end & 1023) ? 1 : 0))
  }

  // TODO: this is not right when setting the index
  fillFalse (start, end) {
    for (; start < end; start++) {
      this.setFalse(start)
    }
    // fillFalse(this.bits, start, end)
    // fillFalse(this.index, start >>> 5, (end >>> 5))
    // fillFalse(this.top, start >>> 10, (end >>> 10))
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
  if (start > end) return

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

// const tmp = new Uint32Array(4)

// fillTrue(tmp, 0, 4 * 32)
// fillFalse(tmp, 1, 65)

// for (let i = 0; i < tmp.length; i++) {
//   console.log(tmp[i].toString(2).padStart(32, '0'))
// }
// return

// const c = IndexContainer.alloc()
// let i = -1

// c.setTrue(0)
// c.setTrue(29999)
// c.setTrue(32000)
// // c.fillTrue(31, 132)
// c.fillFalse(30000, 32768)

// do console.log('next:', i = c.next(i)); while (i !== -1)

// return

// c.setTrue(20000)
// c.setTrue(20031)
// c.setTrue(20032)
// c.setTrue(30000)
// console.log()

// do console.log('next:', i = c.next(i)); while (i !== -1)

// c.setFalse(20031)
// console.log()

// do console.log('next:', i = c.next(i)); while (i !== -1)

// c.setTrue(20031)
// c.setTrue(20033)
// c.setTrue(20035)
// console.log()

// do console.log('next:', i = c.next(i)); while (i !== -1)

// // console.log('next:', i = c.next(-1))
// // console.log('next:', i = c.next(i))
// // console.log('next:', i = c.next(i))
// // console.log('next:', i = c.next(i))

// // console.log(c.next(c.first()))

// // console.log(c.get(100))

// // console.log(i.next())
// //c.setFalse(100)
// //console.log(c.get(100))

// // console.log(c.first().toString(2).padStart(32, '0'))

// return

// for (let i = 0; i < 32 * 1024; i++) {
//   console.log(c.setTrue(i))
// }
