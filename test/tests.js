var assert = require("assert");
var fs = require("fs");
var main = require("../index.js");

describe("require calls", function () {
  it("should be found at top-level", function () {
    var code = [
      "var one = require('util1');",
      'var two = require("util2");',
      "var three = require ( 'util3' ) ;"
    ].join("\n");

    var found = main.find(code);
    assert.deepEqual(found, [
      "util1",
      "util2",
      "util3"
    ]);
  });

  it("should ignore non-free identifiers", function () {
    var code = [
      "var asdf = require('./zxcv');",
      "function foo(require) {",
      "  require('./qwer');",
      "}"
    ].join("\n");

    var found = main.find(code);
    assert.deepEqual(found, ["./zxcv"]);
  });
});

describe("import statements", function () {
  it("should be found at top-level", function () {
    var code = [
      "import one from 'util1';",
      'import two from "util2"',
      "import three from'util3'  ;"
    ].join("\n");

    var found = main.find(code);
    assert.deepEqual(found, [
      "util1",
      "util2",
      "util3"
    ]);

    assert.deepEqual(found, main.find(code));
  });
});

describe("tests.js", function () {
  it("should import the expected modules", function (done) {
    fs.readFile(__filename, "utf8", function (error, code) {
      if (error) {
        done(error);
      } else {
        assert.deepEqual(main.find(code), [
          "assert",
          "fs",
          "../index.js"
        ]);
        done();
      }
    });
  });
});
