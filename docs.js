'use strict';

const acquit = require('acquit');
const fs = require('fs');

require('acquit-ignore')();

const content = fs.readFileSync('./test/examples.test.js').toString();
const blocks = acquit.parse(content);

// include the README until after the specified tag as static non-generated content
const existingReadme = fs.readFileSync('./README.md').toString();
const searchRegion = '<!--DOCS START-->';
const untilIndex = existingReadme.indexOf(searchRegion);

if (untilIndex <= 0) {
  throw new Error('Region ' + JSON.stringify(searchRegion) + ' not found!');
}

let mdOutput = existingReadme.substring(0, untilIndex + searchRegion.length) + '\n\n# API\n\n';

for (let i = 0; i < blocks.length; ++i) {
  const describe = blocks[i];
  mdOutput += '## ' + describe.contents + '\n\n';
  mdOutput += describe.comments[0] ?
    acquit.trimEachLine(describe.comments[0]) + '\n\n' :
    '';

  for (let j = 0; j < describe.blocks.length; ++j) {
    const it = describe.blocks[j];
    mdOutput += '#### It ' + it.contents + '\n\n';
    mdOutput += it.comments[0] ?
      acquit.trimEachLine(it.comments[0]) + '\n\n' :
      '';
    mdOutput += '```javascript\n';
    mdOutput += it.code + '\n';
    mdOutput += '```\n\n';
  }
}

fs.writeFileSync('README.md', mdOutput);
