var amqp = require('amqp');


var myEQ;

var EQ = function (host, exchange, listener) {
	console.log("Configuring AMQP for " + host + " using " + exchange);
	this.connection = amqp.createConnection({host:host});
	this.exchangeName = exchange;
	this.listener = listener;
	this.queue;
	myEQ = this;
	this.connection.on('ready', function() {
		myEQ.connection.queue('', function(q) {
			q.bind(myEQ.exchangeName,"#");

			q.subscribe(myEQ.listener);

		})
	});
}

exports.Events = EQ;

