'use strict';

const acquit = require('acquit');

require('acquit-ignore')();

const content = require('fs').readFileSync('./test/examples.test.js').toString();
const blocks = acquit.parse(content);

let mdOutput =
  '# kareem\n\n' +
  '  [![Build Status](https://github.com/mongoosejs/kareem/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/mongoosejs/kareem/actions/workflows/test.yml)\n' +
  '  <!--[![Coverage Status](https://img.shields.io/coveralls/vkarpov15/kareem.svg)](https://coveralls.io/r/vkarpov15/kareem)-->\n\n' +
  'Re-imagined take on the [hooks](http://npmjs.org/package/hooks) module, ' +
  'meant to offer additional flexibility in allowing you to execute hooks ' +
  'whenever necessary, as opposed to simply wrapping a single function.\n\n' +
  'Named for the NBA\'s all-time leading scorer Kareem Abdul-Jabbar, known ' +
  'for his mastery of the [hook shot](http://en.wikipedia.org/wiki/Kareem_Abdul-Jabbar#Skyhook)\n\n' +
  '<img src="http://upload.wikimedia.org/wikipedia/commons/0/00/Kareem-Abdul-Jabbar_Lipofsky.jpg" width="220">\n\n' +
  '# API\n\n';

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

require('fs').writeFileSync('README.md', mdOutput);
