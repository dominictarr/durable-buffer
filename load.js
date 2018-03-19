module.exports = function (cb) {
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
}
