var crypto = require('crypto')
function hash(b) {
  crypto.createHash('sha256').update(b).digest()
}

function toUInt32BE(i) {
  var I = new Buffer(4)
  I.writeUInt32BE(+i, 0)
  return I
}

module.exports = function (file, bsize, onError) {
  var blocks = {}, dirty = {}
  var fd = obv()
  onError = onError || function (err) { throw err }
  fs.open(file, 'w+', function (err, value) {
    if (err) onError(err)
    else fd.set(value)
  })

  function readBlock(i, cb) {
    var b = new Buffer(bsize)
    fs.read(fd, i*bsize, (i+1)*bsize, b, function (err) {
      cb(err, err ? null : b )
    })
  }

  function load (cb) {
    var header = 32*2+4
    fs.stat(file, function (err, stat) {
      fs.open(file, 'w+', function (err, _fd) {
        fd = _fd
        if(err) return cb(err) //couldn't open the file...
        fs.readFile(file+'~', function (err, buffer) {
          if(err && !stat) return cb() //empty file. okay.
          if(err) return cb(err) //error, because dirty file should always describe the last blocks written.

          var batch = buffer.readUInt32BE(0)
          if(!buffer.slice(36, 36+32).equal(h(buffer.slice(0, 36))))
            return cb(err) //header is incorrect!
          var expected = header_length + batch*36
          if(buffer.length != expected) return cb(new Error('unexpected dirty block size, expected:+'expected+', but got:'+buffer.length)
          for(var i = 0; i < batch; i++) (function (i) {
            var I = buffer.readUInt32BE(header+i*36)
              readBlock(I, function (err, b) {
              if(err) n = -1, cb(err)
              var expected = buffer.slice(header+i*36+4, header+(i+1)*36)
              var actual = hash(b)
              if(!actual.equals(expected)
                n = -1, cb(new Error('expected block:'+i+' to have hash:'+expected.toString('hex')+' but was:'+actual.toString('hex')))
              if(--n) return
              cb()
            })
          })(i)
        })
      })
    })
  }

  return {
    //idea: get returns the buffer.
    //getWrite: returns the buffer, but copies if it's
    //          currently being written. if it's not being
    //          written, they pass the reference.
    get: function (i, cb) {
      if(blocks[i]) return cb(null, blocks[i])
      else if(cbs[i])
        cbs[i].push(cb)
      else {
        cbs[i] = [cb]
        readBlock(i, function (err, b) {
            if(!err) blocks[i] = b
            var _cbs = cbs[i]
            delete cbs[i]
            while(_cbs.length) _cbs.shift()(err, b)
          })
        })
      }
    },
    dirty: function (ary) {
      if(isInteger(ary)) dirty[ary] = true
      else ary.forEach(function (v) { dirty[v] = true })
    },
    flush: function (cb) {
      //if we are already flushing, throw.
      if(isEmtpy(dirty)) cb()
      else {
        //TODO: copy references to blocks, incase they are updated again.
        var a = [], n = 0
        var h = createHash('sha256')
        for(var i in dirty) {
          n++
          var I = toUInt32BE(+i)
          a.push(I)
          var k = hash(blocks[+i])
          a.push(k)
          h.update(I).update(k)
        }
        var d = h.digest(), l = toUInt32BE(n)

        a.unshift(Buffer.concat([
          l, d,
          createHash('sha256').update(l).update(d).digest()
        ]))

        fs.writeFile(file+'~', Buffer.concat(a), function (err) {
          if(err) cb(err)
          each(dirty, function (i) {
            fs.write(fd.value, i*bsize,(i+1)*bsize, blocks[i], function (err) {
              if(err && n > -1) return n = -1, cb(err)
              if(--n) return
              cb()
            })
          })
        })
      }
    }
  }
}






