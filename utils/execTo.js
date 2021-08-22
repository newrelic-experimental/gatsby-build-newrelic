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