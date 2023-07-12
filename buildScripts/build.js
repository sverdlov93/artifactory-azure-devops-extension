const exec = require('child_process').execSync;
const sync = require('rimraf').sync;
const fs = require('fs-extra');
const join = require('path').join;
const TASKS_UTILS_DIR = 'jfrog-tasks-utils';
const TASKS_DIR = 'tasks';
const TESTS_DIR = 'tests';

installJfrogTaskUtils();
installTasks();
installTests();

/**
 *
 * Install JFrog task utils.
 */
function installJfrogTaskUtils() {
    clean(TASKS_UTILS_DIR, true);
    execNpm('i', TASKS_UTILS_DIR);
    exec('npx clean-modules -y --exclude "**/shelljs/src/test.js" --directory ' + join(TASKS_UTILS_DIR, 'node_modules'), { stdio: [0, 1, 2] });
    execNpm('pack', TASKS_UTILS_DIR);
}

/**
 * Install tasks.
 */
function installTasks() {
    fs.readdir(TASKS_DIR, (err, files) => {
        files.forEach((taskName) => {
            let taskDir = join(TASKS_DIR, taskName);
            // We want to ignore files like .DS_Store may exist in TASKS_DIR
            if (!fs.lstatSync(taskDir).isDirectory()) {
                return;
            }
            // If a package.json is missing, npm will exec the install command on the parent folder. This will cause an endless install loop.
            if (fs.existsSync(join(taskDir, 'package.json'))) {
                // tasks/<task-name>/package.json
                clean(taskDir);
                copyTaskUtilsModules(taskDir);
                execNpm('i', taskDir);
            } else {
                // tasks/<task-name>/<task-version>/package.json
                fs.readdir(taskDir, (err, taskVersionDirs) => {
                    taskVersionDirs.forEach((versToBuild) => {
                        let taskVersionDir = join(taskDir, versToBuild);
                        if (fs.existsSync(join(taskVersionDir, 'package.json'))) {
                            clean(taskVersionDir);
                            copyTaskUtilsModules(taskVersionDir);
                            execNpm('i', taskVersionDir);
                        }
                    });
                });
            }
        });
    });
}

/**
 * Install tests.
 */
function installTests() {
    clean(TESTS_DIR);
    copyTaskUtilsModules(TESTS_DIR);
    execNpm('i', TESTS_DIR);
}

/**
 * Copy jfrog-tasks-utils/node_modules to dest/node_modules
 * @param dest - The destination
 */
function copyTaskUtilsModules(dest) {
    fs.copySync(join(TASKS_UTILS_DIR, 'node_modules'), join(dest, 'node_modules'));
}

/**
 * Clean npm install/pack files.
 * @param cwd - (String) - Current working directory.
 * @param cleanPackage (Boolean) - True to clean the 'npm pack' results.
 */
function clean(cwd, cleanPackage) {
    sync(join(cwd, 'node_modules'));
    sync(join(cwd, 'package-lock.json'));
    if (cleanPackage) {
        sync(join(cwd, '*.tgz'));
    }
}

/**
 *
 * @param command - (String) - The command to execute, i.e. install, pack, etc.
 * @param cwd - (String) - Current working directory.
 */
function execNpm(command, cwd) {
    exec('npm ' + command + ' -q --no-fund', { cwd: cwd, stdio: [0, 1, 2] });
}
