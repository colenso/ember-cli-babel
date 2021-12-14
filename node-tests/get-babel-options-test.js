const expect = require("chai").expect;
const MockUI = require("console-ui/mock");
const CoreObject = require("core-object");
const AddonMixin = require("../index");
let {
  _addTypeScriptPlugin,
  _getAddonProvidedConfig,
  _addDecoratorPlugins,
} = require("../lib/babel-options-util");

let Addon = CoreObject.extend(AddonMixin);

describe("get-babel-options", function () {
  const ORIGINAL_EMBER_ENV = process.env.EMBER_ENV;

  beforeEach(function () {
    this.ui = new MockUI();
    let project = {
      isEmberCLIProject: () => true,
      _addonsInitialized: true,
      root: __dirname,
      emberCLIVersion: () => "2.16.2",
      dependencies() {
        return {};
      },
      addons: [],
      targets: {
        browsers: ["ie 11"],
      },
    };

    this.addon = new Addon({
      project,
      parent: project,
      ui: this.ui,
    });

    project.addons.push(this.addon);
  });

  afterEach(function () {
    if (ORIGINAL_EMBER_ENV === undefined) {
      delete process.env.EMBER_ENV;
    } else {
      process.env.EMBER_ENV = ORIGINAL_EMBER_ENV;
    }
  });
  describe("_addTypeScriptPlugin", function () {
    it("should warn and not add the TypeScript plugin if already added", function () {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(
            /has added the TypeScript transform plugin to its build/
          );
        },
      };

      expect(
        _addTypeScriptPlugin(
          [["@babel/plugin-transform-typescript"]],
          {},
          this.addon.parent,
          this.addon.project
        ).length
      ).to.equal(1, "plugin was not added");
    });
  });

  describe("_addDecoratorPlugins", function () {
    it("should include babel transforms by default", function () {
      expect(
        _addDecoratorPlugins({
          plugins: [],
          options: {},
          config: {},
          parent: this.addon.parent,
          project: this.addon.project,
          isClassPropertiesRequired: true,
        }).length
      ).to.equal(2, "plugins added correctly");
    });

    it("should include only fields if it detects decorators plugin", function () {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(
            /has added the decorators plugin to its build/
          );
        },
      };

      expect(
        _addDecoratorPlugins({
          plugins: [["@babel/plugin-proposal-decorators"]],
          options: {},
          config: {},
          parent: this.addon.parent,
          project: this.addon.project,
          isClassPropertiesRequired: true,
        }).length
      ).to.equal(2, "plugins were not added");
    });

    it("should include only decorators if it detects class fields plugin", function () {
      this.addon.project.ui = {
        writeWarnLine(message) {
          expect(message).to.match(
            /has added the class-properties plugin to its build/
          );
        },
      };

      expect(
        _addDecoratorPlugins({
          plugins: [["@babel/plugin-proposal-class-properties"]],
          options: {},
          config: {},
          parent: this.addon.parent,
          project: this.addon.project,
          isClassPropertiesRequired: true,
        }).length
      ).to.equal(2, "plugins were not added");
    });

    it("should use babel options loose mode for class properties", function () {
      let strictPlugins = _addDecoratorPlugins({
        plugins: [],
        options: {},
        config: {},
        parent: this.addon.parent,
        project: this.addon.project,
        isClassPropertiesRequired: true,
      });

      expect(strictPlugins[1][1].loose).to.equal(
        false,
        "loose is false if no option is provided"
      );

      let loosePlugins = _addDecoratorPlugins({
        plugins: [],
        options: { loose: true },
        config: {},
        parent: this.addon.parent,
        project: this.addon.project,
        isClassPropertiesRequired: true,
      });

      expect(loosePlugins[1][1].loose).to.equal(
        true,
        "loose setting added correctly"
      );
    });

    it("should include class fields and decorators after typescript if handling typescript", function () {
      const config = {
        "ember-cli-babel": { enableTypeScriptTransform: true },
      };
      let plugins = _addDecoratorPlugins({
        plugins: ["@babel/plugin-transform-typescript"],
        options: {},
        config,
        parent: this.addon.parent,
        project: this.addon.project,
        isClassPropertiesRequired: true,
      });
      expect(plugins[0]).to.equal(
        "@babel/plugin-transform-typescript",
        "typescript still first"
      );
      expect(plugins.length).to.equal(3, "class fields and decorators added");
    });

    it("should include class fields and decorators before typescript if not handling typescript", function () {
      const config = {
        "ember-cli-babel": { enableTypeScriptTransform: false },
      };
      let plugins = _addDecoratorPlugins({
        plugins: ["@babel/plugin-transform-typescript"],
        options: {},
        config,
        parent: this.addon.parent,
        project: this.addon.project,
        isClassPropertiesRequired: true,
      });

      expect(plugins.length).to.equal(3, "class fields and decorators added");
      expect(plugins[2]).to.equal(
        "@babel/plugin-transform-typescript",
        "typescript is now last"
      );
    });

    it("should not include class fields if they are not required", function () {
      let plugins = _addDecoratorPlugins({
        plugins: [],
        options: {},
        config: {},
        parent: this.addon.parent,
        project: this.addon.project,
        isClassPropertiesRequired: false,
      });
      expect(plugins.length).to.equal(1, "only one plugin");
      expect(plugins[0][0]).to.include(
        require.resolve("@babel/plugin-proposal-decorators"),
        "and the plugin is decorator"
      );
    });
  });

  describe("_getAddonProvidedConfig", function () {
    it("does not mutate addonOptions.babel", function () {
      let babelOptions = { blah: true };
      this.addon.parent = {
        dependencies() {
          return {};
        },
        options: {
          babel: babelOptions,
        },
      };

      let result = _getAddonProvidedConfig(this.addon._getAddonOptions());
      expect(result.options).to.not.equal(babelOptions);
    });
  });
});
