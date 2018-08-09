'use strict';

const path = require('path');
const spawn = require('cross-spawn');
const utils = require('../common/utils');
const exists = require('fs').existsSync;

const GIT_ROOT = utils.getGitRootDirPath(process.cwd());
const {
    FOREACH_COMMAND_KEY,
    FOREACH_COMMAND_PARAM
} = require('../common/const')();

function ForeachRunner() {
    if (!new.target) {
        return new ForeachRunner();
    }

    this.filePathList = [];
    this.packageJsonDirPath = process.cwd();
    this.command = '';
}

ForeachRunner.prototype.run = function () {
    let gitStatus = this.getGitStatus();
    if (!gitStatus) {
        utils.log([
            `There is nothing to commit,`,
            `Skipping running foreach.`
        ], 0);
    }

    this.filePathList = this.getFilePathList(gitStatus);
    if (!this.filePathList.length) {
        utils.log([
            `There is nothing to traverse,`,
            `Skipping running foreach.`
        ], 0);
    }

    this.command = this.getCommandFromPackageJson();
    this.parsedCommand = this.parseCommand(this.command);
    this.traverse(this.filePathList, this.parsedCommand);
};

ForeachRunner.prototype.getGitStatus = function () {
    let status = '';
    try {
        status = spawn.sync('git', ['status', '--porcelain'], {
            stdio: 'pipe',
            cwd: GIT_ROOT
        }).stdout.toString();

        return status;
    } catch (e) {
        utils.log([
            `Fail: run "git status --porcelain",`,
            `Skipping running foreach.`
        ], 0);
    }
};

ForeachRunner.prototype.getFilePathList = function (gitStatusStr) {
    const startIndex = 3;
    let pathList = gitStatusStr.split('\n')
        // Exclude empty string and which starts with "??"(Untraced paths)
        .filter(item => !!item && !/^\?\?/.test(item))
        // Transform to absolute path
        .map(item => path.join(GIT_ROOT ,item.substring(startIndex)))
        // Confirm the path exists
        .filter(item => exists(item));

    return pathList;
};

ForeachRunner.prototype.getCommandFromPackageJson = function () {
    let json = null,
        command = '';
    try {
        json = require(path.join(
            utils.getPackageJsonDirPath(),
            'package.json'
        ));
    } catch (e) {
        utils.log([
            `Fail: Require json from package.json at ${this.packageJsonPath}`,
            `Skipping the hook, process will exit..`,
            `Error message is:`
        ]);
        console.log(e);
        process.exit(0);
    }

    if (json && json[FOREACH_COMMAND_KEY]) {
        command = json[FOREACH_COMMAND_KEY];
    }

    return command;
};

ForeachRunner.prototype.validateCommand = function (command) {
    const re = new RegExp(`^.*[\\w]+\\s+${FOREACH_COMMAND_PARAM}(\\s+.*)*`);
    return re.test(command);
};

ForeachRunner.prototype.parseCommand = function (command) {
    if (!this.validateCommand(command)) {
        utils.log([
            `Your "pce-foreach-command" value is "${command}"`,
            `It's format is incorrect, please modify it in package.json. For example:`,
            `"echo ${FOREACH_COMMAND_PARAM}"`
        ], 1);
    }

    command = command.trim().split(/\s+/);

    let args = command.slice(1);
    let ret = {
        cmd: command[0],
        args: args,
        paramIndex: args.indexOf(FOREACH_COMMAND_PARAM)
    };

    return ret;
};

ForeachRunner.prototype.traverse = function (pathList, parsedCommand) {
    const { cmd, paramIndex } = parsedCommand;
    let args = parsedCommand.args.slice(0);
    pathList.forEach(filePath => {
        args[paramIndex] = filePath;
        spawn.sync(cmd, args, {
            stdio: [0, 1, 2]
        });
    });
};

// Expose the Hook instance so we can use it for testing purposes.
module.exports = ForeachRunner;

// Run only if this script is executed through CLI
if (require.main === module) {
    const foreachRunner = new ForeachRunner();
    foreachRunner.run();
}
