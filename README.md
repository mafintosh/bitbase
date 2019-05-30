# bitbase

WIP, database for bits

## Usage

``` js
const Bitbase = require('bitbase')
const raf = require('random-access-file')

const bb = new Bitbase(raf('bits.db'))

bb.set(42, true, function (err) {
  if (err) throw err
  bb.get(42, function (err, bit) {
    if (err) throw err
    console.log('bb -> ' + bit)
  })
})
```

## LICENSE

MIT
