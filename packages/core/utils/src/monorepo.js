/* global __dirname exports require */

const findUp = require('find-up');
const {readJson, readJsonSync} = require('fs-extra');

const promisify = require('util');
const glob = require('glob');
const globPromisified = promisify(glob);

const {dirname} = require('path');

let _isInsideMonorepo = null;
let monorepoRootPath = null;

const embarkInsidePkg = 'embark-inside-monorepo';
const lernaJson = 'lerna.json';

exports.isInsideMonorepo = function() {
  if (_isInsideMonorepo === null) {
    try {
      _isInsideMonorepo = !!require.resolve(embarkInsidePkg);
    } catch (err) {
      _isInsideMonorepo = false;
    }
  }

  return _isInsideMonorepo;
};

const globArgs = function() {
  return [
    '**/package.json',
    {
      cwd: monorepoRootPath,
      ignore: [
        '**/node_modules/**',
        'package.json',
        'scripts/**',
        'site/**'
      ]
    }
  ];
};

const couldNotFindPkgErrorMsg = function(pkgName) {
  return `could not find any package named ${pkgName} inside the embark monorepo at ${monorepoRootPath}`;
};

const couldNotFindRootErrorMsg = `could not find embark's monorepo's root starting from ${__dirname}`;

const notInsideErrorMsg = 'embark-utils is not inside the monorepo';

const partialMatch = function(pkgJsonPath, pkgName) {
  let dir = dirname(pkgJsonPath);
  if (dir.startsWith('embark-')) {
    dir = dir.slice(7);
  }
  if (pkgName.startsWith('embark-')) {
    pkgName = pkgName.slice(7);
  }
  return dir.includes(pkgName);
};

exports.findPackageFromRoot = async function(pkgName) {
  if (!exports.isInsideMonorepo()) {
    throw new Error(notInsideErrorMsg);
  }

  if (monorepoRootPath === null) {
    try {
      monorepoRootPath = dirname(await findUp(lernaJson));
    } catch (err) {
      // do nothing
    } finally {
      if (!monorepoRootPath) {
        throw new Error(couldNotFindRootErrorMsg);
      }
    }
  }

  const pkgJsonPaths = (await globPromisified(...globArgs())).filter(partialMatch);

  // delete the following line and this comment
  console.log(require('util').inspect(pkgJsonPaths));

  const jsons = function*() {
    for (const path of pkgJsonPaths) {
      yield Promise.all([readJson(path), path]);
    }
  };

  let pkgPath;
  for await (const [json, path] of jsons()) {
    if (json.name === pkgName) {
      pkgPath = dirname(path);
      break;
    }
  }

  if (pkgPath) return pkgPath;

  throw new Error(couldNotFindPkgErrorMsg(pkgName));
};

exports.findPackageFromRootSync = function(pkgName) {
  if (!exports.isInsideMonorepo()) {
    throw new Error(notInsideErrorMsg);
  }

  if (monorepoRootPath === null) {
    try {
      monorepoRootPath = dirname(findUp.sync(lernaJson));
    } catch (err) {
      // do nothing
    } finally {
      if (!monorepoRootPath) {
        throw new Error(couldNotFindRootErrorMsg);
      }
    }
  }

  const pkgJsonPaths = glob.sync(...globArgs()).filter(partialMatch);

  // delete the following line and this comment
  console.log(require('util').inspect(pkgJsonPaths));

  const jsons = function*() {
    for (const path of pkgJsonPaths) {
      yield [readJsonSync(path), path];
    }
  };

  let pkgPath;
  for (const [json, path] of jsons()) {
    if (json.name === pkgName) {
      pkgPath = dirname(path);
      break;
    }
  }

  if (pkgPath) return pkgPath;

  throw new Error(couldNotFindPkgErrorMsg(pkgName));
};
