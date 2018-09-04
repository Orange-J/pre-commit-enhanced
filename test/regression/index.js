/**
 * Regression testing in a real scene.
 */

const fs = require('fs');
const path = require('path');
const assume = require('assume');

// const spawn = require('cross-spawn');
const utils = require('../../common/utils');
const { execSync } = require('child_process');

const PCE_ROOT_DIR = process.cwd(); // This module's git reposition root dir path.
const TESTING_DIR_NAME = 'sandbox';
const TESTING_DIR_PATH = path.join(PCE_ROOT_DIR, TESTING_DIR_NAME);

// If there is an exsiting "sandbox" dir, remove it.
if (fs.existsSync(TESTING_DIR_PATH)) {
    try {
        execSync(`rm -rf ./${TESTING_DIR_NAME}`);
    } catch (e) {
        utils.log(`Can't remove the existing "${TESTING_DIR_NAME}" directory, skip testing.`);
        return;
    }
}

// Create "sandbox" directory and some files and directory in sandbox.
try {
    execSync([
        `mkdir ${TESTING_DIR_NAME}`,
        `cd ${TESTING_DIR_NAME}`,
        `mkdir node_modules`,
        `cd node_modules`,
        `mkdir pre-commit-enhanced`,
        `cd ..`,
        `echo node_modules > .gitignore`,
        `echo {"pre-commit":["markHookOk"],"scripts":{"markHookOk":"touch hook_run_ok"}} > package.json`,
        `echo init > commited`,
        `git init`
    ].join(` && `));
} catch (e) {
    utils.log(`Can't create file construct in "sandbox" directory, skip testing.`);
    return;
}

// Copy code file.
try {
    [
        'common',
        'scripts',
        'hook',
        'index.js',
        'install.js',
        'uninstall.js',
        'package.json'
    ].forEach(name => {
        execSync(`cp -a ./${name} ./${TESTING_DIR_NAME}/node_modules/pre-commit-enhanced`);
    });
} catch (e) {
    utils.log(`Error occured when copy code file to sandbox, skip testing.`);
    return;
}

// Install dependence for copied code.
try {
    execSync([
        `cd ${TESTING_DIR_NAME}/node_modules/pre-commit-enhanced`,
        `npm install --production`
    ].join(` && `));
} catch (e) {
    utils.log(`Error occured when install dependence for copied code in sandbox, skip testing.`);
    return;
}

// Run install.js.
describe('regression - install.js', function () {
    let ok = true;
    try {
        execSync([
            `cd ${TESTING_DIR_NAME}`,
            `node ./node_modules/pre-commit-enhanced/install.js`
        ].join(` && `));
    } catch (e) {
        ok = false;
    }

    it('run install.js without errors', function () {
        assume(ok).true();
    });

    it('install "pre-commit" hook file in .git/hooks', function () {
        assume(
            fs.existsSync(`./${TESTING_DIR_NAME}/.git/hooks/pre-commit`)
        ).true();
    });
});

// Git commit and trigger hook.
describe('regression - index.js(common hook)', function () {
    let ok = true;
    try {
        execSync([
            `cd ${TESTING_DIR_NAME}`,
            `echo foo >> commited`,
            `git add commited`,
            `git commit -m test`
        ].join(` && `));
    } catch (e) {
        ok = false;
    }

    it('passed pre-commit hook and git commit successly', function () {
        assume(ok).true();
    });

    it('hook really is triggered and run successly', function () {
        assume(
            fs.existsSync(`./${TESTING_DIR_NAME}/hook_run_ok`)
        ).true();
    });
});

// TODO: Remove sandbox at a reasonable moment.
