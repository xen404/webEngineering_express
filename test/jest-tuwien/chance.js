const Chance = require('chance');
const chance = new Chance(__SEED__);
chance.mixin({
    'artworkId': function () {
        return chance.integer({ min: 1, max: 1000000 });
    },
    'printSize': function () {
        return chance.pickone(['S', 'M', 'L']);
    },
    'matColor': function () {
        return chance.pickone(['ivory', 'mint', 'wine', 'indigo', 'coal']);
    },
    'frameStyle': function () {
        return chance.pickone(['classic', 'natural', 'shabby', 'elegant']);
    },
    'frameWidth': function () {
        return chance.floating({ min: 2, max: 5, fixed: 1 });
    },
    'matWidth': function () {
        return chance.floating({ min: 0, max: 10, fixed: 1 });
    },
    'cartItem': function () {
        const matWidth = chance.matWidth() * 10;
        const item = {
            artworkId: chance.artworkId(),
            printSize: chance.printSize(),
            frameStyle: chance.frameStyle(),
            frameWidth: chance.frameWidth() * 10,
            matWidth: matWidth
        };
        if (matWidth > 0) {
            item.matColor = chance.matColor();
        }
        return item;
    },
    'nanoid': function () {
        return chance.string({ pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', length: 21 });
    },
    'shippingAddress': function () {
        const address = {
            name: chance.name(),
            address: chance.address(),
            city: chance.city(),
            country: chance.country(),
            postal_code: chance.postcode()
        };
        if (chance.bool()) {
            address.phone = chance.phone()
        }
        return address;
    },
    'blingPaymentIntentId': function () {
        return 'pi_' + chance.nanoid()
    },
    'blingClientSecret': function () {
        return 'cs_' + chance.nanoid()
    },
    'blingEventId': function () {
        return 'ev_' + chance.nanoid()
    }
});

module.exports = { chance };