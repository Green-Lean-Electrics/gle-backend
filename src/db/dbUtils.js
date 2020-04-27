const mongoose = require('mongoose');
const cachegoose = require('cachegoose');
const config = require('../config')

mongoose.Promise = global.Promise;

//Establish connection with remote database

const url = 'mongodb://' + config.db.user + ':' + config.db.password + '@' +  config.db.host + ':' + config.db.port + '/' + config.db.dbName

mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.connection.once('open', () => console.log('Connected to MongoDB at ' + config.db.host))

cachegoose(mongoose)