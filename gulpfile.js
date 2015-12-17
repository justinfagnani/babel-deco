'use strict';

let gulp = require('gulp');
let babel = require('gulp-babel');
let es = require('event-stream');

// gulp.task('default', ['vendor', 'lib', 'demo']);

gulp.task('dist', function() {
  return gulp.src('src/deco.js')
      .pipe(babel())
      .pipe(gulp.dest(''));
});
