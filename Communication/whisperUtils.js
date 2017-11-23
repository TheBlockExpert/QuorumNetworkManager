var messageString = require('./messageStrings.js');
var config = require('../config.js')

function getSymmetricKey(shh, cb){
  if(config.whisper.symKeyID){
    cb(null, config.whisper.symKeyID)
  } else {
    let id = shh.generateSymKeyFromPassword(
      config.whisper.symKeyPassword, function(err, id){
      config.whisper.symKeyID = id
      cb(err, config.whisper.symKeyID)
    })
  }
}

function getAsymmetricKey(shh, cb){
  if(config.whisper.asymKeyID){
    cb(null, config.whisper.asymKeyID)
  } else {
    let id = shh.newKeyPair(function(err, id){
      config.whisper.asymKeyID = id
      cb(err, config.whisper.asymKeyID)
    })
  }
}

function addSubscription(symKeyID, topicArr, shh, onData){
  let topics = buildFilterObject(topicArr).topics
  let subscription = shh.subscribe('messages', {topics, symKeyID})
  subscription.on('data', onData)
  subscription.on('error', function(error){
    console.log('ERROR:', error)
  })
}

function addBootstrapSubscription(topics, shh, onData){

  getSymmetricKey(shh, function(err, symKeyID){
    if(err){console.log('ERROR:', err)}
    addSubscription(symKeyID, topics, shh, onData) 
  })
}

function buildTopicHexString(topic) {
  let hexString = '0x' + new Buffer(topic).toString('hex')
  return hexString.substring(0, 10)
}

function buildFilterObject(topics) {
  let hexTopics = []
  for(let topic of topics){
    hexTopics.push(buildTopicHexString(topic))
  }
  return {'topics': hexTopics}
}

// TODO: this can be improved to take in some defaults for ttl and workToProve
// TODO: this can also perhaps have the option between an object with the parameters or 
// the individual parameters
function buildPostObject(shh, topic, payload, ttl, cb) {
  getSymmetricKey(shh, function(err, symKeyID) {
    if(err){console.log('ERROR:', err)}
    getAsymmetricKey(shh, function(err, sig) {
      if(err){console.log('ERROR:', err)}
      postObj = { 
        symKeyID,
        sig,
        topic,
        payload,
        ttl
      };
      cb(null, postObj);
    });
  });
}

// interval specified in milliseconds
function postAtInterval(message, shh, topic, interval, cb) {  
  let hexMessage = new Buffer(message).toString('hex')
  let hexTopic = buildTopicHexString(topic);
  buildPostObject(shh, hexTopic, hexMessage, 10, function() {
    let intervalID = setInterval(function(){
      web3RPC.shh.post(postObj, function(err, res){
        if(err){console.log('err', err)}
      })
    }, interval)
    cb(null, intervalID);
  });
}

exports.getAsymmetricKey = getAsymmetricKey
exports.addSubscription = addSubscription
exports.addBootstrapSubscription = addBootstrapSubscription
exports.postAtInterval = postAtInterval
