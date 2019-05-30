const tape = require('tape')
const Bitfield = require('./')

tape('set and get', function (t) {
  const bits = create()

  bits.set(4242, true, function (err) {
    t.error(err, 'no error')
    bits.get(4242, function (err, bit) {
      t.error(err, 'no error')
      t.ok(bit, 'should be set')
      bits.get(4243, function (err, bit) {
        t.error(err, 'no error')
        t.notOk(bit, 'should not be set')
        t.end()
      })
    })
  })
})

tape('set and unset', function (t) {
  const bits = create()

  bits.set(4242, true, function (err) {
    t.error(err, 'no error')
    bits.get(4242, function (err, bit) {
      t.error(err, 'no error')
      t.ok(bit, 'should be set')
      bits.set(4242, false, function (err, bit) {
        t.error(err, 'no error')
        bits.get(4242, function (err, bit) {
          t.error(err, 'no error')
          t.notOk(bit, 'should not be set')
          t.end()
        })
      })
    })
  })
})

function create () {
  return new Bitfield(require('random-access-memory')())
}
