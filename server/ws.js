var EQ = require('./events.js').Events;
var ActiveClients = require('./rules.js').actives;
var EventGenerator = require('./rules.js').EventGenerator;
var Rules = require('./rules.js').Rules;

var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(5000, function() {
    console.log((new Date()) + ' Server is listening on port 5000');
});

var WebSocketServer = require('websocket').server
  , wss = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

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

var ensureMessage = function(message) {
	if (typeof message === "string") {
		try {
			return JSON.parse(message);
		} catch (err) {
			throw "{'error':true,'description':'Malformed JSON'}"
		}
	} else if (typeof message === "object") {
		return message;
	}
	throw "{'error':true,'description':'Neither string nor object'}"

}

wss.on('request', function(request) {
    	console.log("Connection achieved")

	    var ws = request.accept(null, request.origin);

    	ws.on('message', function(message) {
    		console.log("Incoming message");
    		var msg = null;
    		try {
    			msg = ensureMessage(message);

    		} catch (err) {
    			ws.send(err);
    		}
        	var type = msg.type;
        	if (type == null) {
        		ws.send("{'error':true,'description':'No message type specified'}");
        		return;
        	}

        	if (type == 'listen' || type == 'claim') {
        		msg.socket = ws;
				Rules.assert(EventGenerator(msg));
				Rules.match(function(err){
					console.log("Match result?");
					if(err){
					    console.error(err.stack);
					}else{
					    console.log("done");
					}
				});

	        } 
    	});
		ws.on('close', function(msg) {
			console.log("BYE");
		});
		
});



var events = new EQ('mq.mrgreen.zone','mrg-domain', function(message) {
	console.log(message.data.toString());
	var msg = EventGenerator(JSON.parse(message.data.toString()));
	Rules.assert(msg);
	Rules.match(function(err){
		if(err){
		    console.error("Match error: " + err.stack);
		}
	});
})

