var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 5000});

var games  = {
	'bloodsuckers':30105
};
var currentPlayers = {
	30105:[]
}
var playerMap = {

};

var errorHandler = function (err) {
	console.log("Error????");
	if (err) {
		console.log("Failure");
	} else {
		console.log("No error? Amusing.");
	}
};

wss.on('connection', function(ws) {
    	console.log("Connection achieved")

    	ws.on('message', function(message) {
        	console.log('received: %s', message);
        	var object = JSON.parse(message);
        	if (games[object.game]!=null && playerMap[object.AccountId]== null) {
        		object.ws = ws;
        		currentPlayers[games[object.game]].push(object);
        		object.wagered = 0;
        		object.result = 0;
        		playerMap[object.AccountId] = object;

        		ws.send("OK");
        	} else {
        		ws.send("INACTIVE");
        	}
    	});
		ws.on('close', function(msg) {
			console.log("BYE");
		});
		
});


var amqp = require('amqp');

var connection = amqp.createConnection({ host: 'mq.mrgreen.zone' });

// Wait for connection to become established.
connection.on('ready', function () {
  // Use the default 'amq.topic' exchange
  connection.queue('', function (q) {
      // Catch all messages
      q.bind('mrg-domain','#');

      // Receive messages
      q.subscribe(function (message) {
        // Print messages to stdout
        var str = message.data.toString();
        var msg = JSON.parse(str);
        if (msg._type == "ROUND") {
	        var gameId = msg.event.catThree;
	        var AccountId = msg.event.player.accountid;
	        var wager = msg.event.betAmount;
	        var won = msg.event.winAmount;
	        var result = won-wager;
	        playerMap[AccountId].wagered+=wager;
	        playerMap[AccountId].result+=result;

	        switch (msg.event.player.currency) {
	        	case "SEK":
	        		console.log("IS SEK");
	        		if (playerMap[AccountId].wagered >= 10) {
	        			console.log("*************** WINNER ***********");
	        			playerMap[AccountId].ws.send("{BonusAvailable:true, BonusName:'BloodMoney', Amount:100, Currency:" + msg.event.player.currency + "}");
	        			playerMap[AccountId].bonusAvailable= true;
	        			playerMap[AccountId].bonusAmount = 100;
	        			playerMap[AccountId].wagered -=10;
	        		}
	        		break;
	        	case "EUR":
	        		console.log("IS EUR");
	        		break;
	        }
	    } else if (msg._type == "LOGOUT") {
	    	console.log("LOGOUT::" + str);
	    	console.log("Player " + msg.event.player.accountid + " just logged out");
	    	playerMap[AccountId] = null;
	    } else if (msg._type == "LOGIN") {
	    	console.log("Player " + msg.event.player.accountid + " just logged in");
	    } 
        //console.log(message.data.toString());
      });
  });
});