/**
 * This module extends the default implementation of supertest to print the path or a custom message identifying failing requests
 */

import {Test} from 'supertest';

const origEnd = Test.prototype.end;
Test.prototype.end = function (fn) {
  return origEnd.call(this, function (err, res) {
    return fn(getError.call(this, err), res);
  });
}

Test.prototype.message = function (msg) {
  this.msg = msg;
  return this;
}

function getError(err) {
  if (!err) {
    return err;
  }

  const path = this.url.replace(/^https?:\/\/[^\/]+/, '');
  let msg = `Unexpected result for ${this.method} ${path}`;
  if (this.msg) {
    msg += `\n\n  ${this.msg}`;
  }

  if (err instanceof Error) {
    // Update the error instance
    err.message = `${msg}\n\n${err.message}`;
    return err;
  }

  // Just return as string
  return `${msg}\n\n${err}`;
}
