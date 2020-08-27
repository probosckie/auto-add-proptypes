import fs from 'fs';

const classLineRegex = /class(.*)extends/;
const propsChainedRegex = /props\.[a-zA-Z0-9]+[^a-zA-Z0-9]/;
const propsEndRegex = /props\.[a-zA-Z0-9]+$/;
const propTypesLineStartingRegex = /^[a-zA-Z0-9]+\:/;

const propsConstThisDeclarationRegex = /const \{(.*)\} = this.props/;
const propsLetThisDeclarationRegex = /let \{(.*)\} = this.props/;
const propsConstDeclarationRegex = /const \{(.*)\} = props/;
const propsLetDeclarationRegex = /let \{(.*)\} = props/;
const propsPlainDeclarationRegex = /\{(.*)\} = this.props/;
const PROPS_NOT_FOUND = 'propsNotFound';
const constructorLine = /constructor\(props\)/;
const superLineRegex = /super\(props\)/;
const propsDestructureRegex = /^\s+} = this\.props(;|,)/;
const propsDestructureRegex2 = /^\s+} = props(;|,)/;
const constDeclarationStart = /^\s+const {/;
const letDeclarationStart = /^\s+let {/;
const partsBetweenDestructureParenthesis = /(.*),/;
const somethingAlphanumberThenNonAlphaNumeric = /[a-zA-Z0-9]+[^a-zA-Z0-9]/;

const getDerivedStateFromPropsRegex = /static getDerivedStateFromProps\(/;

const ignoreFiles = {
  'duck.js': 1,
  'saga.js': 1,
  'ga.js': 1,
  'constants.js': 1,
  '.DS_Store': 1,
};

const ignoreDir = {
  __tests__: 1,
};

export function getLines(filePath) {
  let fileText = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  let fileLines = fileText.split('\n');
  return fileLines;
}

export function invertObject(obj) {
  let newObj = {};

  for (let i in obj) {
    newObj[obj[i]] = i;
  }
  return newObj;
}

export function lastChar(s) {
  return s[s.length - 1];
}
export const startsWithNoTab = (line) => line[0] && line[0] !== ' ';
export const startsWithTab = (line) => line[0] === ' ' && line[1] === ' ';
export const isEmptyLine = (line) => line.trim().length === 0;
const isAlphaNumeric = (f) =>
  (f >= 'a' && f <= 'z') || (f >= 'A' && f <= 'Z') || (f >= '0' && f <= '9');
export const searchWholeWord = (line, word) => {
  const index = line.indexOf(word);
  if (index !== -1) {
    if (
      !isAlphaNumeric(line[index - 1]) &&
      !isAlphaNumeric(line[index + word.length])
    ) {
      return true;
    }
    return false;
  }
  return false;
};

export function findClassName(classLine) {
  let splitLine = classLine.split(' ');
  let index = splitLine.findIndex((v) => v === 'extends');
  return splitLine[index - 1];
}

function getCodeBlocks(lines) {
  let codeBlocks = [],
    currentCodeBlock = [],
    isCodeBlock = false;

  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    if (isCodeBlock) {
      currentCodeBlock.push(line);
      if (startsWithNoTab(nextLine) && startsWithTab(line)) {
        codeBlocks.push([...currentCodeBlock]);
        currentCodeBlock = [];
        isCodeBlock = false;
      }
    }

    if (!isCodeBlock && startsWithNoTab(line) && startsWithTab(nextLine)) {
      isCodeBlock = true;
      currentCodeBlock.push(line);
    }
  }
  return codeBlocks;
}

export function getCodeBlocks2(lines) {
  let codeBlocks = [],
    currentCodeBlock = [],
    isCodeBlock = false;

  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i];
    if (isCodeBlock) {
      currentCodeBlock.push(line);
      if (line === '}') {
        codeBlocks.push([...currentCodeBlock]);
        currentCodeBlock = [];
        isCodeBlock = false;
      }
    }

    if (!isCodeBlock && classLineRegex.test(line)) {
      isCodeBlock = true;
      currentCodeBlock.push(line);
    }
  }
  return codeBlocks;
}

export function doesCodeBlockHaveProps(codeBlockLines) {
  if (codeBlockLines.find) {
    return codeBlockLines.find((line) => searchWholeWord(line, 'props'));
  }
}

function createObjectFromEntries(arr, prevObj) {
  arr.forEach((element) => (prevObj[element] = true));
  return prevObj;
}

const findLinesWithProps = (lines) => {
  return lines.reduce((acc, line, currentIndex) => {
    let test =
      superLineRegex.test(line) ||
      constructorLine.test(line) ||
      getDerivedStateFromPropsRegex.test(line);
    if (!test && searchWholeWord(line, 'props')) {
      acc.push({ line, index: currentIndex });
    }
    return acc;
  }, []);
};

const extractPropsFromLine = (lineWithProps) => {
  const testWithPropsEnd = propsEndRegex.test(lineWithProps);
  if (propsChainedRegex.test(lineWithProps) || testWithPropsEnd) {
    if (testWithPropsEnd) {
      return [lineWithProps.match(propsEndRegex)[0].substr(6)];
    } else {
      const match = lineWithProps.match(propsChainedRegex);
      return [match[0].substring(6, match[0].length - 1)];
    }
  } else {
    if (propsConstThisDeclarationRegex.test(lineWithProps)) {
      return lineWithProps
        .match(propsConstThisDeclarationRegex)[1]
        .trim()
        .split(',');
    }
    if (propsLetThisDeclarationRegex.test(lineWithProps)) {
      return lineWithProps
        .match(propsLetThisDeclarationRegex)[1]
        .trim()
        .split(',');
    }
    if (propsConstDeclarationRegex.test(lineWithProps)) {
      return lineWithProps
        .match(propsConstDeclarationRegex)[1]
        .trim()
        .split(',');
    }
    if (propsLetDeclarationRegex.test(lineWithProps)) {
      return lineWithProps.match(propsLetDeclarationRegex)[1].trim().split(',');
    }

    if (propsPlainDeclarationRegex.test(lineWithProps)) {
      return lineWithProps
        .match(propsPlainDeclarationRegex)[1]
        .trim()
        .split(',');
    }

    return PROPS_NOT_FOUND;
  }
};

const extractPropsFromDestructureBlock = (block, index) => {
  let props = [],
    i = index - 1;
  while (
    !(
      constDeclarationStart.test(block[i]) || letDeclarationStart.test(block[i])
    ) &&
    block[i]
  ) {
    let test = block[i].match(partsBetweenDestructureParenthesis);
    if (!test) {
      console.log('test failed for this line');
      console.log(block[i]);
    } else {
      let furtherExtract =
        test[1] && test[1].match(somethingAlphanumberThenNonAlphaNumeric);
      if (furtherExtract && furtherExtract[0]) {
        props.push(furtherExtract[0].trim());
      } else if (!furtherExtract && test[1]) {
        props.push(test[1].trim());
      }
    }
    i--;
  }
  return props;
};

export const extractProps = (block) => {
  const isPropsPresent = doesCodeBlockHaveProps(block);
  if (isPropsPresent) {
    let collectProps = {},
      couldNotFindPropsForSomeLines = false;
    const className = findClassName(block[0]);
    let linesWithProps = findLinesWithProps(block);

    linesWithProps.forEach(({ line, index }) => {
      //extract props 1 way
      let props = extractPropsFromLine(line);
      //extract props other way
      if (
        propsDestructureRegex.test(line) ||
        propsDestructureRegex2.test(line)
      ) {
        //console.log('trying to find props in destructure');
        props = extractPropsFromDestructureBlock(block, index);
      }
      if (Array.isArray(props)) {
        createObjectFromEntries(
          props.map((prop) => prop.trim()),
          collectProps,
        );
      } else {
        if (!Array.isArray(couldNotFindPropsForSomeLines)) {
          couldNotFindPropsForSomeLines = [];
        }
        couldNotFindPropsForSomeLines.push(line);
        //couldNotFindPropsForSomeLines = true;
      }
    });

    return {
      name: className,
      props: collectProps,
      couldNotFindPropsForSomeLines,
    };
  } else {
    return false;
  }
};

export const findExistingPropsInFile = (filePath, componentName) => {
  const lines = getLines(filePath);
  let start = 0,
    end = 0;
  const proptypeString = `${componentName}.propTypes = {`;
  const endOfPropTypes = '};';
  let isExtractOn = false;
  let lines2 = [];
  let propsArray = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes(proptypeString)) {
      start = i;
      isExtractOn = true;
      continue;
    }
    if (line === endOfPropTypes) {
      end = i;
      isExtractOn = false;
      break;
    }

    if (isExtractOn) {
      lines2.push(line.trim());
    }
  }

  isExtractOn = false;

  for (let i = 0; i < lines2.length; i++) {
    let line = lines2[i];

    if (propTypesLineStartingRegex.test(line)) {
      isExtractOn = false;
      propsArray.push(line);
      if (lastChar(line) !== ',') {
        isExtractOn = true;
        continue;
      }
    }
    if (isExtractOn) {
      propsArray[propsArray.length - 1] =
        propsArray[propsArray.length - 1] + ' ' + line;
    }
  }

  return propsArray.length > 0 ? { propsArray, start, end } : false;
};

export const transformPropArray = (existingProps) => {
  let transformedObject;
  transformedObject = existingProps.reduce((acc, current) => {
    let splitted = current.split(':');
    let key = splitted[0].trim();
    let value = removeEndComma(splitted[1]);
    acc[key] = value;
    return acc;
  }, {});
  return transformedObject;
};

export const combineObject = (typedObject, plainObject) => {
  let plainObjectCopy = {
    ...plainObject,
  };
  for (let key in typedObject) {
    if (key in plainObject) {
      plainObjectCopy[key] = typedObject[key];
    } else {
      plainObjectCopy[key] = typedObject[key];
    }
  }
  return plainObjectCopy;
};

export function writeToFile(pathToJsFile, data) {
  fs.writeFile(pathToJsFile, data, (err) => {
    console.log('the file is written');
  });
}

export function removeEndComma(str) {
  let x = str.trim();
  if (lastChar(x) === ',') {
    return x.substring(0, x.length - 1);
  }
  return x;
}

export const createPropType = (componentName, propObject) => {
  const lines = [];
  lines.push(`${componentName}.propTypes = {`);
  Object.keys(propObject).forEach((key) => {
    lines.push(`  ${key}: ${propObject[key]},`);
  });
  lines.push(`};`);
  return lines;
};

export const doesFileContainClass = (file) => {
  const lines = getLines(file);
  const blocks = getCodeBlocks2(lines);
  return blocks.length !== 0;
};

var walkSync = function (dir, filelist) {
  var path = path || require('path');
  var fs = fs || require('fs'),
    files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function (file) {
    if (!(file in ignoreDir)) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        filelist = walkSync(path.join(dir, file), filelist);
      } else {
        if (file.split('.')[1] === 'js' && !(file in ignoreFiles)) {
          filelist.push(path.join(dir, file));
        }
      }
    }
  });
  return filelist;
};

export const findListOfFiles = (rootPath) => {
  const list = fs.statSync(rootPath).isFile() ? [rootPath] : walkSync(rootPath);
  return list.filter((file) => doesFileContainClass(file));
};
