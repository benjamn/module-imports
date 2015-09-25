var hasOwn = Object.prototype.hasOwnProperty;
var acorn = require("acorn");
var types = require("ast-types");
var crypto = require("crypto");
var NodePath = types.NodePath;
var cache = Object.create(null);

function findPossibleIndexes(source) {
  var pattern = /\b(require\s*\(|from)\s*['"]/g;
  var indexes = [];
  var match;

  while ((match = pattern.exec(source))) {
    indexes.push(match.index);
  }

  return indexes;
}

function parse(source) {
  return acorn.parse(source, {
    ecmaVersion: 6,
    sourceType: "module",
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true
  });
}

function isNode(value) {
  return value &&
    typeof value === "object" &&
    typeof value.type === "string" &&
    typeof value.start === "number" &&
    typeof value.end === "number";
}

function getRequiredIdentifier(path) {
  var value = path.value;
  if (value.type === "CallExpression" &&
      value.callee.type === "Identifier" &&
      value.callee.name === "require" &&
      value.arguments.length > 0) {
    var arg = value.arguments[0];
    if (arg.type === "Literal" &&
        typeof arg.value === "string" &&
        path.scope.lookup("require") === null) {
      return arg.value;
    }
  }
}

function getImportedIdentifier(path) {
  var value = path.value;
  if (value.type === "ImportDeclaration") {
    return value.source.value;
  }
}

exports.find = function find(source) {
  var indexes = findPossibleIndexes(source);
  if (indexes.length === 0) {
    return [];
  }

  var cacheKey = crypto
    .createHash("sha1")
    .update(source)
    .digest("hex");

  if (hasOwn.call(cache, cacheKey)) {
    return cache[cacheKey].slice(0);
  }

  var identifiers = Object.create(null);

  function traverse(path, left, right) {
    var value = path.value;

    if (left < right && isNode(value)) {
      var start = value.start;
      var end = value.end;

      // Narrow the left-right window to exclude indexes that fall outside
      // of the current node.
      while (left < right && indexes[left] < start) ++left;
      while (left < right && end < indexes[right - 1]) --right;

      if (left < right) {
        var id = getRequiredIdentifier(path);
        if (typeof id === "string") {
          identifiers[id] = value;
          return;
        }

        var id = getImportedIdentifier(path);
        if (typeof id === "string") {
          identifiers[id] = value;
          return;
        }

        var names = types.getFieldNames(value);
        for (var n = 0, nameCount = names.length; n < nameCount; ++n) {
          var name = names[n];
          var child = value[name];
          if (Array.isArray(child)) {
            for (var i = 0, childCount = child.length; i < childCount; ++i) {
              traverse(path.get(name, i), left, right);
            }
          } else if (isNode(child)) {
            traverse(path.get(name), left, right);
          }
        }
      }
    }
  }

  traverse(new NodePath(parse(source)), 0, indexes.length);

  return cache[cacheKey] = Object.keys(identifiers);
};
