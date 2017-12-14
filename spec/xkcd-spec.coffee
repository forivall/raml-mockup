path = require('path')
mockServer = require('../lib/mock-server')
fetch = require('./helpers/fetch')

test = (raml, n) ->
  describe "XKCD example #{n}", ->
    killServer = null

    beforeEach (done) ->
      mockServer
        port: 9002
        silent: true
        raml: raml
        fakeroot: 'http://json-schema.org'
        directory: './spec/fixtures-xkcd/schemas'
      , (err, stop) ->
        killServer = stop
        done()

    afterEach ->
      killServer()

    describe 'making requests', ->
      it 'should responds to /info.0.json', (done) ->
        fetch 'http://localhost:9002/info.0.json?_forceExample=true', (err, response) ->
          expect(response.json.safe_title).toEqual 'Morse Code'
          expect(response.status).toBe 200
          done()

      it 'should responds to /x/info.0.json', (done) ->
        fetch 'http://localhost:9002/x/info.0.json?_forceExample=true', (err, response) ->
          expect(response.json.safe_title).toEqual 'Morse Code'
          expect(response.status).toBe 200
          done()

test(path.join(__dirname, './fixtures-xkcd/api.raml'), 1)
test(path.join(__dirname, './fixtures-xkcd/api2.raml'), 2)
