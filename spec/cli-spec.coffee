cmd = require('./helpers/cmd')

describe 'CLI options', ->
  describe 'Missing arguments', ->
    beforeEach cmd

    xit 'should display "Missing arguments"', ->
      expect(cmd.stderr).toContain 'Missing arguments'

    it 'should exit with 1', ->
      expect(cmd.exitStatus).toEqual 1

  describe 'Invalid RAML-file', ->
    beforeEach (done) ->
      cmd './not_exists.raml', done

    xit 'should display "Invalid input"', ->
      expect(cmd.stderr).toContain 'Invalid input'

    it 'should exit with 1', ->
      expect(cmd.exitStatus).toEqual 1

  describe 'Valid RAML-file', ->
    describe 'missing --fakeroot option', ->
      beforeEach (done) ->
        cmd './spec/fixtures/api.raml', done

      xit 'should fail on remote references', ->
        expect(cmd.stderr).toMatch /Error: cannot (reach|parse) http:\/\/json-schema.org\/song-schema.json/

    describe 'using --fakeroot http://json-schema.org', ->
      describe 'missing --directory', ->
        beforeEach (done) ->
          cmd './spec/fixtures/api.raml -f http://json-schema.org', done

        xit 'should fail on faking local references', ->
          expect(cmd.stderr).toMatch /no such file or directory.*?spec\/fixtures\/song-schema.json/

  describe 'Usage info', ->
    beforeEach (done) ->
      cmd '-h', done

    xit 'should display usage-info only', ->
      expect(cmd.stdout).toContain 'Usage:'

    it 'should exit with 1', ->
      expect(cmd.exitStatus).toEqual 1

  describe 'Version', ->
    beforeEach (done) ->
      cmd '-v', done

    xit 'should display the current version', ->
      expect(cmd.stdout).toMatch /raml-mockup \d+\.\d+\.\d+/

    it 'should exit with 1', ->
      expect(cmd.exitStatus).toEqual 1
