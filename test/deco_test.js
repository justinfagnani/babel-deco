'use strict';

require("babel-core/register");
let babel = require('babel-core');
let deco = require('../deco').default;

let result = babel.transform(`
  @qux
  class A {
    @foo bar = 'a';
  }
`, {
  // 'presets': ['ES2015'],
  'plugins': [
    'syntax-decorators',
    'syntax-class-properties',
    deco,
    'transform-class-properties',
  ],
});

console.log('result.code:\n', result.code);
// console.log('result.ast', result.ast.program.body[0].body.body);
