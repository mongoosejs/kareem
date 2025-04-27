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

let mdOutput = existingReadme.substring(0, untilIndex + searchRegion.length) + '\n\n# API';

for (const describe of blocks) {
  mdOutput += '\n\n';
  mdOutput += '## ' + describe.contents;
  // only add spacing and comments, if there are comments
  if (describe.comments[0]) {
    mdOutput += '\n\n';
    // acquit "trimEachLine" does not actually trim the last line for some reason
    mdOutput += acquit.trimEachLine(describe.comments[0]).trim();
  }

  for (const it of describe.blocks) {
    mdOutput += '\n\n';
    mdOutput += '#### It ' + it.contents + '\n\n';

    if (it.comments[0]) {
      mdOutput += acquit.trimEachLine(it.comments[0]) + '\n';
    }

    mdOutput += '```javascript\n';
    mdOutput += it.code + '\n';
    mdOutput += '```';
  }
}

mdOutput += '\n';

fs.writeFileSync('README.md', mdOutput);
