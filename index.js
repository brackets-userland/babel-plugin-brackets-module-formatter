// babel plugin to transform es6 modules into brackets compatible modules
// based on https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-es2015-modules-amd/src/index.js

var template = require('babel-template');

// wrap everything in iife to avoid leaking globals
var iifeDeclaration = template('(function () { \'use strict\'; BODY; }())');

// if the file is loaded within brackets (define is present), use it to declare module
// otherwise (define is not present in brackets node domains) execute immediately
var checkForDefineDeclaration = template('if (typeof define !== \'undefined\') { define(bracketsModule); } else { bracketsModule(require, exports, module); }');

// this is the template for module declaration
var bracketsModuleDeclaration = template('function bracketsModule(require, exports, module) { BODY; }');

module.exports = function (_babel) {
  // var t = babel.types;

  return {
    inherits: require('babel-plugin-transform-es2015-modules-commonjs'),

    visitor: {
      Program: {
        exit: function exit(path) {
          if (path.bracketsModuleFormatterRan) { return; }
          path.bracketsModuleFormatterRan = true;

          var node = path.node;

          // create the iife and put original body into bracketsModule function
          var iife = iifeDeclaration({
            BODY: [
              checkForDefineDeclaration(),
              bracketsModuleDeclaration({ BODY: node.body })
            ]
          });

          // move the directives to the iife body
          iife.expression.callee.body.directives = node.directives;
          node.directives = [];

          // set the iife as the new body
          node.body = [ iife ];
        }
      }
    }
  };
};
