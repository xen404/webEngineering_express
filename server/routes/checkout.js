/**
 * This module contains the routes under /shipping
 */

"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const BLING_BASE_URL = "https://web-engineering.big.tuwien.ac.at/s20/bling";

const routes = express.Router();

routes.post("/", (req, res) => {
  let id = req.cookies.sessionId;
  res.send(cart[id]);
  if (!cart[id]) {
    res.send(403);
  }
  if (cart[id].length == 0) {
    res.send(400);
  }
});

routes.post("/payment-update", (req, res) => {
  if (req.body.status !== "succeeded") {
    res.sendStatus(400);
  }
});

module.exports = routes;
