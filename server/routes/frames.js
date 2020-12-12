/**
 * This module contains the routes under /frames
 */

'use strict';

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const met_api= "https://collectionapi.metmuseum.org/public/collection/v1/";
var objectCache ={};
var searchCache ={};

const routes = express.Router();

routes.get('/', (req, res) => {

    let frames = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/frames.json')));
    let i;
    for (i = 0; i < Object.keys(frames).length; i++) {
        frames[i].style = frames[i].id;
        frames[i].labelTemp = frames[i].label;
        delete frames[i].label;
        frames[i].label = frames[i].labelTemp;
        delete frames[i].labelTemp;
        frames[i].slice = frames[i].border.slice;
        delete frames[i].id;
        delete frames[i].border;
        delete frames[i].image;
    }

    res.send(frames);
});





routes.get('/:style/:imageType', (req, res) => {
    const style = req.params.style;
    const imageType = req.params.imageType;
    var options = {
        root: path.join(__dirname, '../resources'),
        dotfiles: 'deny'
    }

    if (style !== "classic" && style !== 'natural' && style !== 'shabby' && style !== 'elegant')
    {
        console.log('Could not find frame with style ' + style);
        res.sendStatus(404);
        return false;
    }
    if (imageType !== 'thumbImage' && imageType !== 'borderImage')
    {
        console.log('Could not find frame picture with image type ' + imageType);
        res.sendStatus(404);
        return false;
    }

    let images = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/frames.json')));
    console.log(images);

    if (imageType === 'thumbImage'){
        console.log('Get ' + imageType + ' of the frame with style ' + style);
        switch (style) {
            case "classic":
                res.sendFile(path.join(__dirname, '../resources/' + images[0].image)); 
                break;
            case "elegant":
                res.sendFile(path.join(__dirname, '../resources/' + images[3].image));
                break;
            case "natural":
                res.sendFile(path.join(__dirname, '../resources/' + images[1].image));
                break;
            case "shabby":
                res.sendFile(path.join(__dirname, '../resources/' + images[2].image));
                break;
        }
    }
    if (imageType === 'borderImage')
    {
        console.log('Get ' + imageType + ' of the frame with style ' + style);
        switch (style) {
            case "classic":
                res.sendFile(path.join(__dirname, '../resources/' + images[0].border.image)); 
                break;
            case "elegant":
                res.sendFile(path.join(__dirname, '../resources/' + images[3].border.image)); 
                break;
            case "natural":
                res.sendFile(path.join(__dirname, '../resources/' + images[1].border.image)); 
                break;
            case "shabby":
                res.sendFile(path.join(__dirname, '../resources/' + images[2].border.image)); 
                break;
        }
    }
});

module.exports = routes;