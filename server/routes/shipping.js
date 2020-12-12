/**
 * This module contains the routes under /shipping
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const destinations = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/destinations.json')));

const routes = express.Router();

routes.get('/', (req, res) => {
  res.send({destinations: destinations});
});

module.exports = routes;
