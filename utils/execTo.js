const {
  execSync
} = require(`child_process`);

const execToStr = (cmd) => {
  try {
    var _execSync;

    return String((_execSync = execSync(cmd, {
      encoding: `utf8`
    })) !== null && _execSync !== void 0 ? _execSync : ``).trim();
  } catch (error) {
    console.log(error);
    return ``;
  }
}

const execToInt = (cmd) => {
  // `parseInt` can return `NaN` for unexpected args
  // `Number` can return undefined for unexpected args
  // `0 | x` (bitwise or) will always return 0 for unexpected args, or 32bit int
  try {
    const resultString = execToStr(cmd);

    return resultString ? parseInt(resultString, 10) : 0;
  } catch (error) {
    console.log(error);
    return ``;
  }
}

module.exports = {
  execToStr,
  execToInt
};