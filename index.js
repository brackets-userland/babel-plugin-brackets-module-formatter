var template = require("babel-template");

// wrap everything in iife to avoid leaking globals
var iifeDeclaration = template('(function () { \'use strict\'; BODY; }())');

// if the file is loaded within brackets (define is present), use it to declare module
// otherwise (define is not present in brackets node domains) execute immediately
var ensureDefine = template('if (typeof define !== \'undefined\') { define(bracketsModule); } else { bracketsModule(require, exports, module); }');

// this is the template for module declaration
var buildDefine = template('function bracketsModule(require, exports, module) { IMPORTS; BODY; }');

module.exports = function (babel) {
  var t = babel.types
	
  function isValidRequireCall(path) {
    if (!path.isCallExpression()) return false;
    if (!path.get("callee").isIdentifier({ name: "require" })) return false;
    if (path.scope.getBinding("require")) return false;

    var args = path.get("arguments");
    if (args.length !== 1) return false;

    var arg = args[0];
    if (!arg.isStringLiteral()) return false;

    return true;
  }

  var amdVisitor = {
    ReferencedIdentifier: function ReferencedIdentifier(options) {
	  var node = options.node;
	  var scope = options.scope;
	  
      if (node.name === "exports" && !scope.getBinding("exports")) {
        this.hasExports = true;
      }

      if (node.name === "module" && !scope.getBinding("module")) {
        this.hasModule = true;
      }
    },

    CallExpression: function CallExpression(path) {
      if (!isValidRequireCall(path)) return;
      this.bareSources.push(path.node.arguments[0]);
      path.remove();
    },

    VariableDeclarator: function VariableDeclarator(path) {
      var id = path.get("id");
      if (!id.isIdentifier()) return;

      var init = path.get("init");
      if (!isValidRequireCall(init)) return;

      var source = init.node.arguments[0];
      this.sourceNames[source.value] = true;
      this.sources.push([id.node, source]);

      path.remove();
    }
  };

  return {
    inherits: require("babel-plugin-transform-es2015-modules-commonjs"),

    pre: function pre() {
      // source strings
      this.sources = [];
      this.sourceNames = {};

      // bare sources
      this.bareSources = [];

      this.hasExports = false;
      this.hasModule = false;
    },

    visitor: {
      Program: {
        exit: function exit(path) {
          if (path.bracketsModuleFormatterRan) {			  
			  return;
		  }
		  path.bracketsModuleFormatterRan = true;

          path.traverse(amdVisitor, this);
		  
		  var params = this.sources.map(function (source) { return source[0]; });
          var sources = this.sources.map(function (source) { return source[1]; });

          sources = sources.concat(this.bareSources.filter(function (str) {
            return !this.sourceNames[str.value];
          }.bind(this)));

          var moduleName = this.getModuleName();
          if (moduleName) moduleName = t.stringLiteral(moduleName);

          var imports = sources.map(function (source, index) {
			var req = t.callExpression(t.identifier("require"), [source]);
			var param = params[index];
			if (param) {
				return t.variableDeclaration("var", [t.variableDeclarator(param, req)]);
			}
			return t.expressionStatement(req);
		  });
		  
		  var node = path.node;	
		  node.directives = [];
		  node.body = [
		    iifeDeclaration({
				BODY: [
					ensureDefine(),			
					buildDefine({
					  IMPORTS: imports,
					  BODY: node.body
					})
				]			
			})		    
		  ];
        }
      }
    }
  };
}