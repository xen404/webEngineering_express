/**
 * This module contains the routes under /artworks
 */

'use strict';

const express = require('express');
const routes = express.Router();
  const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const met_api= "https://collectionapi.metmuseum.org/public/collection/v1/";
var objectCache ={};
var searchCache ={};

routes.get('/', async (req, res) => {
  if (req.query.q == null) {
    const highlights=  JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/highlights.json')));
    var respList = [];
    for (let iterator of highlights) {
      if(objectCache[iterator]== null ||!objectCache[iterator])
      {
        let pic = await fetch(met_api+`objects/` + iterator);
        let obj = await pic.json();
        objectCache[iterator] = {artworkId: obj.objectID, title: obj.title, artist: obj.artistDisplayName, date: obj.objectDate, image: obj.primaryImageSmall};
      }
      respList.push(objectCache[iterator]);
    }
    res.json(respList);
  } else {
    let q = req.query.q;
    if(searchCache[q]==null || !searchCache[q])
    {
      const search = await fetch(met_api+'search?q='+q+'&hasImages=true');
      if(search.status	!==	200)	{	
        console.log('Could	not	find	objects	with	seach '	+	q);	
        res.sendStatus(404);
        return	false;	
        }	
      searchCache[q]= await search.json();
    }
    if(searchCache[q].objectIDs ==null)
    {
      searchCache[q].objectIDs= [];
    }
    searchCache[q].objectIDs=searchCache[q].objectIDs.slice(0,100);
    var respList = [];
    for (let iterator of searchCache[q].objectIDs) {
      if(objectCache[iterator]== null ||!objectCache[iterator])
      {
        let pic = await fetch(met_api+`objects/` + iterator);
        if(pic.status	!==	200)	{	
          console.log('Could	not	find	objects	with	seach '	+	q);	
          res.sendStatus(404);
          return	false;	
          }	
        let obj = await pic.json();
        objectCache[iterator] = {artworkId: obj.objectID, title: obj.title, artist: obj.artistDisplayName, date: obj.objectDate, image: obj.primaryImageSmall};
      }
      respList.push(objectCache[iterator]);
    }
    res.json(respList);
  }
});

routes.get('/:id', async (req, res) => {
  const id = req.params.id;
  if(objectCache[id]== null ||!objectCache[id])
  {
    const resp= await fetch(met_api+'objects/'+id);
    if(resp.status	!==	200)	{	
    console.log('Could	not	find	object	with	id'	+	id);	
    res.sendStatus(404);
    return	false;	
    }	
  
    const obj = await resp.json();
    objectCache[id] = {artworkId: obj.objectID, title: obj.title, artist: obj.artistDisplayName, date: obj.objectDate, image: obj.primaryImageSmall};
  }
  
  res.json(objectCache[id]);

  
});

module.exports = routes;
