
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const nanoid = require('nanoid');
const price = require('../utils/price');
const BLING_BASE_URL = 'https://web-engineering.big.tuwien.ac.at/s20/bling';
const cart = {};
const routes = express.Router();

routes.get('/', async (req, res) => {
    if(req.cookies.sessionId == null) {
      let id = nanoid.nanoid();
      cart[id] = new Array();
      res.cookie('sessionId', id, {path: '/cart', expires: new Date(Date.now() + 1800000)});
      res.status(200);
      res.send(cart[id]);
    } 
    else if(cart[req.cookies.sessionId])
    {
      let id = req.cookies.sessionId;
      res.cookie('sessionId', id, {path: '/cart', expires: new Date(Date.now() + 1800000)});
      res.send(cart[id]);
    }
    else
    {
        res.sendStatus(403);
    }
    
});


// Überprüfung fehlt noch 
routes.post('/', async(req, res) => {
  let reqbody = req.body;
  let resbody = {};
  let error;
    if(!cart[req.cookies.sessionId])
    {
      res.send(403);
    }
    else if(!reqbody.artworkId)
    {
      res.send(400);
    }

    else{
      let id = req.cookies.sessionId;
      resbody["artworkId"] = reqbody.artworkId;
      resbody["cartItemId"] = cart[id].length + 1;
      resbody["frameStyle"] = reqbody.frameStyle;
      resbody["frameWidth"] = reqbody.frameWidth;
      resbody["matColor"] = reqbody.matColor;
      resbody["matWidth"] = reqbody.matWidth;
      resbody["price"] = price.calculatePrice(reqbody.printSize, reqbody.frameStyle, reqbody.frameWidth, reqbody.matWidth)
      resbody["printSize"] = reqbody.printSize;
      cart[id].push(resbody);
      res.send(201);
    }
   

});

routes.delete('/', async (req, res) => {
  if(!cart[req.cookies.sessionId])
  {
    res.send(403);
  }
  else{
    cart[req.cookies.sessionId] = new Array();
    res.sendStatus(204);
  }
});

routes.delete('/:id', async(req, res) => {
  const id = req.params.id;
  let found = false;
  if(!cart[req.cookies.sessionId])
  {
    res.send(403);
  } else {
    for (let i = 0; i < cart[req.cookies.sessionId].length; i++) {
      if (cart[req.cookies.sessionId][i].cartItemId == id) {
        cart[req.cookies.sessionId].splice(i, 1);
        found = true;
        res.send(204);
      }
    }
    if (!found) {
      res.send(404);
    }
  }
  
});

routes.get('/:id', async(req, res) => {
  const id = req.params.id - 1;
  if(cart[req.cookies.sessionId])
  {
    if(cart[req.cookies.sessionId][id])
    {
      res.send(cart[req.cookies.sessionId][id]);
    }
    else{
      res.send(404);
    }
  }
  else{
    res.send(403);
  }
});


routes.post('/checkout', (req, res) => {
  let id = req.cookies.sessionId;
  if (!cart[id]) {
    res.send(403);
  }
  if (!cart[id][0]) {
    res.send(400);
  }
  else{

  let price = 0;
  for (let i = 0; i < cart[id].length; i++) {
    price += cart[id][i].price;
  }

  const data = {amount: price, currency: 'eur', webhook: 'http://localhost:3000/cart/checkout/payment-update'};

  fetch(BLING_BASE_URL + '/payment_intents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(process.env.BLING_API_KEY).toString('base64')
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
    res.status(200).send({
      payment_intent_id: data.id,
      client_secret: data.client_secret,
      amount: data.amount,
      currency: data.currency
    });
  })
  .catch((error) => {
    res.status(400).send(error);
  });
 }
});

routes.post('/checkout/payment-update', (req, res) => {
    if(req.body.status !== 'succeeded') {
      res.sendStatus(400);
    }
});

module.exports = routes;
exports.cart = cart;