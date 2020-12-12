/**
 * This module contains the routes under /mats
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

let mats = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/mat-colors.json')));
let i;
for (i = 0; i < Object.keys(mats).length; i++) {
    mats[i].hex = mats[i].color;
    mats[i].color = mats[i].id;
    delete mats[i].id;
}

const routes = express.Router();

routes.get('/', (req, res) => {
  res.send(mats);
});

module.exports = routes;
