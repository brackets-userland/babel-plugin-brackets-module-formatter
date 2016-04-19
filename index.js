var template = require("babel-template");

var buildDefine = template(`
  define(MODULE_NAME, [SOURCES], FACTORY);
`);

var buildFactory = template(`
  (function (PARAMS) {
    BODY;
  })
`);

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
          if (this.ran) {
			  return;
		  }
          this.ran = true;

          path.traverse(amdVisitor, this);

          var params = this.sources.map((source) => source[0]);
          var sources = this.sources.map((source) => source[1]);

          sources = sources.concat(this.bareSources.filter(function (str) {
            return !this.sourceNames[str.value];
          }));

          var moduleName = this.getModuleName();
          if (moduleName) moduleName = t.stringLiteral(moduleName);

          if (this.hasExports) {
            sources.unshift(t.stringLiteral("exports"));
            params.unshift(t.identifier("exports"));
          }

          if (this.hasModule) {
            sources.unshift(t.stringLiteral("module"));
            params.unshift(t.identifier("module"));
          }

          var node = path.node;
          var factory = buildFactory({
            PARAMS: params,
            BODY: node.body
          });
          factory.expression.body.directives = node.directives;
          node.directives = [];

          node.body = [buildDefine({
            MODULE_NAME: moduleName,
            SOURCES: sources,
            FACTORY: factory
          })];
        }
      }
    }
  };
}