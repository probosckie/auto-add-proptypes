const files = require('./filesWithProps');
import path from 'path';
import fs from 'fs';
import {
  getLines,
  getCodeBlocks2,
  doesCodeBlockHaveProps,
  extractProps,
  lastChar,
} from './utils';

const basePath = '/Users/prabhasjoshi/code/x';

files.filesWithProps.forEach((file) => {
  const filePathName = path.join(basePath, file);
  fs.exists(filePathName, (exists) => {
    if (exists && path.extname(filePathName) === '.js') {
      const blocks = getCodeBlocks2(getLines(filePathName)).filter((block) =>
        doesCodeBlockHaveProps(block),
      );
      blocks.forEach((block) => {
        let obj = extractProps(block);

        if (obj.couldNotFindPropsForSomeLines) {
          console.log(
            '------------------------------------------------------------------------------------',
          );
          console.log(filePathName);
          console.log(obj.name);
          console.log(obj.couldNotFindPropsForSomeLines);
        }
      });
    }
  });
});
