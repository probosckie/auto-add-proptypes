const http = require('http');
const socket = require('socket.io');
const express = require('express');
const fs = require('fs');
const path = require('path');
import EV from './eventNames';

import {
  getLines,
  getCodeBlocks2,
  extractProps,
  writeToFile,
  createPropType,
  findListOfFiles,
  findExistingPropsInFile,
  transformPropArray,
  combineObject,
} from './utils';

const basePath = '/Users/prabhasjoshi/code/x';
const filePath = 'src/js/views/Contacts/ContactModal/Step2.js';

const pathToFile = path.join(basePath, filePath);

//let lines = getLines(pathToFile);

const port = 3051;
const index = require('./routes');

const app = express();
app.use(index);

const server = http.createServer(app);

const io = socket(server);

let rootPath = '';

let listOfFiles = [];
let currentFileIndex = 0;
let maxCodeBlocks = 0;
let codeBlocks;
let currentCodeBlock = 0;

let propStartLineNumber = undefined,
  propEndLineNumber = undefined;

io.sockets.on('connection', newConnection);

function newConnection(socket) {
  console.log('New client connected');

  socket.on(EV.FIND_PROPS, (data) => {
    let codeBlock = codeBlocks[data.currentCodeBlock];
    let result = extractProps(codeBlock);
    let existingProps = findExistingPropsInFile(
      listOfFiles[currentFileIndex],
      result.name,
    );

    let allProps = {};
    if (existingProps) {
      propStartLineNumber = existingProps.start;
      propEndLineNumber = existingProps.end;
      allProps = transformPropArray(existingProps.propsArray);
      allProps = combineObject(allProps, result.props);
      result.props = allProps;
    } else {
      propStartLineNumber = undefined;
      propEndLineNumber = undefined;
    }
    io.sockets.emit(EV.PROPS_RESULT, result);
  });

  socket.on(EV.FETCH_FROM_ROOT, (data) => {
    rootPath = data.rootPath;
    findAllFilesAndCodeBlocksInRootPath();
  });

  socket.on(EV.PERSIST_PROPS, (data) => {
    console.log(data);
    let fileName = data.fileName;
    let lines = getLines(fileName);
    let extra = createPropType(data.name, data.propsDataType);

    if (propStartLineNumber && propEndLineNumber) {
      lines.splice(
        propStartLineNumber,
        propEndLineNumber - propStartLineNumber + 1,
        ...extra,
      );
    } else {
      lines = lines.concat(extra);
    }

    fs.writeFile(fileName, lines.join('\n'), (err) => {
      if (!err) {
        io.sockets.emit(EV.PERSIST_SUCCESS);
      } else {
        console.log('error happened');
        console.log(err);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on(EV.FETCH_CODE_BLOCK, (data) => {
    io.sockets.emit(EV.SET_CODE_BLOCK, {
      codeBlock: codeBlocks[data.currentCodeBlock],
      currentCodeBlock: data.currentCodeBlock,
    });
  });

  socket.on(EV.FETCH_NEXT_FILE, () => {
    currentFileIndex = currentFileIndex + 1;
    const file = listOfFiles[currentFileIndex];
    if (file) {
      const lines = getLines(file);
      codeBlocks = getCodeBlocks2(lines);
      socket.emit(EV.SET_WORKING_FILE, {
        fileName: file,
        maxCodeBlocks: codeBlocks.length - 1,
        currentCodeBlock: 0,
      });
    }
  });

  function findAllFilesAndCodeBlocksInRootPath() {
    listOfFiles = findListOfFiles(rootPath);
    const file = listOfFiles[currentFileIndex];
    if (file) {
      const lines = getLines(file);
      codeBlocks = getCodeBlocks2(lines);
      socket.emit(EV.SET_WORKING_FILE, {
        fileName: file,
        maxCodeBlocks: codeBlocks.length - 1,
        currentCodeBlock: 0,
        filesLength: listOfFiles.length,
      });
    }
  }
}

server.listen(port, () => console.log(`Listening on port ${port}`));
