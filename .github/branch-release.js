const { execSync } = require("child_process");
var pjson = require('../package.json');
const currentVersion = pjson.version;
console.log(pjson.version);

const checkNpmToken = () => {
  const npmToken = process.env.NPM_TOKEN;
  if (!npmToken) {
    console.error(`❌ NPM_TOKEN is not set ❌`);
    process.exit(1);
  }
  return;
}

const getBranchName = () => {
  return executeCommand(`git rev-parse --abbrev-ref HEAD`);
}

const checkBranchTagExists = (branchName) => {
  return executeCommand(`npm view ruairi-test dist-tags.${branchName}`)
}

const executeCommand = (cmd) => {
  try {
    const result = execSync(cmd);
    return result.toString().trim();
  }
  catch (err){ 
    console.log(`❌ Error: ${err} ❌`)
    console.log(`❌ Stderr: ${err.stderr.toString()} ❌`)
    process.exit(1);
  }
}

const getNextBranchVersion = (branchName, branchTag) => {
  if (branchTag) {
    console.log(`ℹ️ Branch tag '${branchTag}' already exists ℹ️`);
    const baseVersion = branchTag.substring(0, branchTag.lastIndexOf('.'));
    const dotVersionString = branchTag.substring(branchTag.lastIndexOf('.') + 1);
    const dotVersion = parseInt(dotVersionString);
    console.log({ baseVersion, dotVersion });
    return `${baseVersion}.${dotVersion + 1}`;
  } else {
    console.log(`ℹ️ Branch tag '${branchName}' does not exist yet ℹ️`);
    console.log(`${currentVersion}-${branchName}.1`)
    return `${currentVersion}-${branchName}.1`;
  }
}

const checkNodeVersion = () => {
  const nodeVersion = process.version;
  const nodeVersionParts = nodeVersion.split('.');
  const majorVersion = parseInt(nodeVersionParts[0].replace('v', ''));
  const minorVersion = parseInt(nodeVersionParts[1]);
  console.log({ nodeVersion, majorVersion, minorVersion });
  if (majorVersion !== 16) {
    console.error(`❌ Currently using ${nodeVersion}, please run 'nvm use 16' to switch to Node 16 ❌`);
    process.exit(1);
  } else {
    console.log(`✅ Node version ${nodeVersion} is OK ✅`);
    return;
  }
}

const yarnInstall = () => {
  try {
    console.log('📦 Checking dependencies are up to date... 📦');
    execSync(`yarn install --frozen-lockfile`);
    console.log(`✅ yarn.lock is up to date ✅`);
    return;
  }
  catch (err){ 
    console.log(`❌ Error: ${err} ❌`)
    console.error(`❌ yarn.lock is out of sync. Please run 'yarn install' to update! ❌`)
    process.exit(1);
  }
}

const setYarnVersion = (nextBranchVersion) => {
  const yarnVersion = executeCommand(`yarn version --new-version "${nextBranchVersion}" --no-git-tag-version`);
  console.log(`✅ Yarn version set ✅`)
  console.log(yarnVersion)
}

const publishYarnVersion = (nextBranchVersion, branchTag) => {
  const published = executeCommand(`yarn publish --new-version "${nextBranchVersion}" --access public --tag ${branchTag}`);
  console.log(`✅ Yarn version set ✅`)
  console.log(published)
}
const main = async () => {
  checkNpmToken();
  const branchName = getBranchName();
  console.log(branchName);
  const branchTag = checkBranchTagExists(branchName);
  console.log(branchTag);
  const nextBranchVersion = getNextBranchVersion(branchName, branchTag);
  console.log({nextBranchVersion});
  checkNodeVersion();
  yarnInstall();
  // setYarnVersion(nextBranchVersion);
  publishYarnVersion(nextBranchVersion, branchTag)
}

main();