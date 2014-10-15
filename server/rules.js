var nools = require("nools");

var actives = {

}
var unclaimed = {

}

//EVENTS

var LoginEvent = function(time, accountid) {
	this.type = "LOGIN";
	this.time = time;
	this.accountid = accountid;
	this.processed = false;
	this.register = function() {
		actives[this.accountid] = new User(this.accountid);
	}
}

var LogoutEvent = function(time, accountid) {
	this.type = "LOGOUT";
	this.time = time;
	this.accountid = accountid;
	this.processed = false;
	this.unregister = function() {
		actives[this.accountid] = null;
	}
}

var RoundEvent = function(time, accountid, bet, result, balance, bonusbet, bonuswin, game) {
	this.time= time;
	this.accountid = accountid;
	this.bet = bet;
	this.result = result;
	this.balance = balance;
	this.bonusbet = bonusbet;
	this.bonuswin = bonuswin;
	this.game = game;
	this.processed = false;
}

var GameStartEvent = function(account, game) {
	this.account = account;
	this.game = game;
	this.processed = false;
}
var BonusClaimEvent = function (account, claim, id) {
	this.account = account;
	this.claim = claim;
	this.bonusid = id;
}

var GameData = function(gameid) {
	this.game = gameid;
	this.roundcounts = 0;
	this.totalbet = 0;
	this.totalresult = 0;
	this.winstreak = false;
	this.streakcount = 0;
	this.streakdelta = 0;


	this.update = function(bet, result) {
		this.roundcounts+=1;
		this.totalbet+=bet;
		this.totalresult+=result;
		//on a winning streak;
		if (this.winstreak && result < 0) {
			this.streakcount = 1;
			this.winstreak = false;
			this.streakdelta = result;
		} else if ( !this.winstreak && result > 0) {
			this.streakcount = 1;
			this.winstreak = true;
			this.streakdelta = result;
		} else {
			this.streakcount++;
			this.streakdelta+=result;
		}
	}


	
}
var Bonus = function(name, accountid, uid, code, amount, currency) {
	this.accountid = accountid;
	this.uid = uid;
	this.type = type;
	this.code = code;
	this.amount = amount;
	this.currency = currency;

	this.claim = function() {
		if (this.code == "handout") {
			//do handout
		} else {
			//trigger freespins
		}
	}

	this.getMessage = function() {
		return "{'bonusname':" + this.name + "','bonustype':'" + this.type + "','bonusuid':'" + this.uid + "'}";
	}
}
var User = function(accountid) {
	
	this.accountid = accountid;
	this.sessionbets = 0;
	this.sessiontotal = 0;
	this.gameData  = {

	}


	this.webSocket = null;
	this.activeBonus = null;

	this.setBonus = function(bonus) {
		this.activeBonus = bonus;
		unclaimed[this.activeBonus.uid];
		if (this.webSocket!=null) {
			//send bonus message);
			this.webSocket.send(bonus.getMessage());
		}

	}

	this.setSocket = function(socket) {
		this.webSocket = socket;
	}
	this.sendMessage = function(message) {
		if (typeof message ==="object") {
			message = JSON.stringify(message);
		}
		this.webSocket.send(message);
	}



	this.startGame = function(game) {
		if (this.gameData[game]==null) {
			this.gameData[game] = new GameData(game);
		}
	}
	this.round = function(round) {
		console.log(this.accountid + " has played a round in " + round.game);
		if (this.gameData[round.game]!=null) {
			console.log("Game exists in gamedata");
			this.gameData[round.game].update(round.bet, round.result);
			this.sessionbets +=round.bet;
			this.sessiontotal +=round.result;
			console.log(this.accountid + " playing " + round.game);
			console.log("Round: " + round.bet + " and result: " + round.result);
			console.log("So far for session: " + this.sessionbets + " and result " + this.sessiontotal);

		} else {
			console.log("No such game: " + round.game + " so starting");
			this.startGame(round.game);
			this.round(round);
		}



	}
}
var ListenEvent = function(accountid,socket) {
	this.acccountid = acccountid;
	this.webSocket = socket
}

var ClaimEvent = function(accountid, bonusid, claim) {
	this.accountid = accountid;
	this.bonusid = bonusid;
	this.claim = claim;
}

var flow = nools.flow("MyFlow", function (flow) {

    //find any message that start with hello
    /*flow.rule("Login", [LoginEvent, "m", "m.accountid!= null && m.processed==false"], function (facts) {
    	console.log("Processing login");
        facts.m.processed = true ;
        actives[facts.m.accountid] = m;
        this.modify(facts.m);
    });*/
	
	flow.rule("Listen",[ListenEvent, "m", "m.accountid>0 && m.socket != null "], function(facts) {
		console.log("Adding listener");
		if (actives[facts.m.accountid]!=null) {
    		actives[facts.m.accountid].setSocket(facts.m.socket);
    	} else {
    		console.log("Unknown user: registering for " + facts.m.accountid);
    		actives[facts.m.accountid] = new User(facts.m.accountid);
    		console.log(JSON.stringify(actives[facts.m.accountid]));
    		actives[facts.m.accountid].setSocket(facts.m.socket);
    	}

	});
	flow.rule("Claim", [ClaimEvent, "m", "m.accountid>0"], function(facts) {
		console.log("TODO");
	});


    flow.rule("Login", [LoginEvent, "m", "m.accountid > 0 && !m.processed"], function (facts) {
    	console.log("Login processing");
        facts.m.processed = true;
        facts.m.register();
        //this.modify(facts.m);
    });
    flow.rule("Logout", [LogoutEvent, "m", "m.accountid > 0 && !m.processed"], function (facts) {
    	console.log("Logout processing");
        facts.m.processed = true;
        facts.m.unregister();
        //this.modify(facts.m);
    });
    flow.rule("GameRound", [RoundEvent, 'm','m.accountid> 0  && !m.processed'], function(facts) {
    	console.log("Gameround processing");
    	facts.m.processed = true;
    	if (actives[facts.m.accountid]!=null) {
    		console.log(JSON.stringify(actives[facts.m.accountid]));
    		actives[facts.m.accountid].round(facts.m);
    	} else {
    		console.log("Unknown user: registering for " + facts.m.accountid);
    		actives[facts.m.accountid] = new User(facts.m.accountid);
    		console.log(JSON.stringify(actives[facts.m.accountid]));
    		actives[facts.m.accountid].round(facts.m);
    	}
    	//this.modify(facts.m);
    });
    /*flow.rule("Logout",[LogoutEvent, 'm', '!m.processed!=true'], function(facts) {
    	console.log("Processing logout");
    	facts.m.processed = true;
    	actives[m.accountid] = null;
    	this.modify(facts.m);
    });
    flow.rule("GameRound", [RoundEvent, 'm','m.processed!=true'], function(facts) {
    	console.log("Processing game round");
    	facts.m.processed = true;
    	if (actives[m.accountid]!=null) {
    		actives[m.accountid].round(facts.m);
    	}
    	this.modify(facts.m);
    });*/
});


var clientSession = flow.getSession();




var EventGenerator = function(event) {
	if (event._type == "LOGIN") {
		return new LoginEvent(event.event.eventId, event.event.player.accountid);
	} else if (event._type == "LOGOUT") {
		return new LogoutEvent(event.event.eventId, event.event.player.accountid);
	} else if (event._type == "ROUND") {
		return new RoundEvent(event.event.eventId, event.event.player.accountid, 
			event.event.betAmount, event.event.winAmount-event.event.betAmount, event.event.balance,
			event.event.bonusBetAmount, event.event.bonusWinAmount, event.event.catThree);
	} else if (event.type=='listen') {
		return ListenEvent(event.accountid, event.socket);
	}  else if (event.type == 'claim' && unclaimed[event.bonusid]!=null) {
		return ClaimEvent(event.account, event.bonusid, event.claim);
	}
	
}
exports.EventGenerator = EventGenerator;
exports.ActiveClients = actives;
exports.Rules = clientSession;



/*{"_type":"ROUND","event":{"eventId":2014101414491000001,"nyxId":2014101414491000001,"player":{"accountid":111215719,"firstname":"Sdfgdfg","lastname":"Dfgdf","nickname":"Sdfgdfg D","zip":"dfg","currency":"GBP","language":"EN","country":"GB","city":"dfgdfg","sex":"F","operatorid":118},"channel":"I","client":"flash","outcome":"W","balance":5435,"winAmount":70,"bonusWinAmount":0,"betAmount":10,"bonusBetAmount":0,"subsystemId":4,"catOne":1,"catTwo":1,"catThree":300001}}
{"_type":"LOGOUT","event":{"eventId":2014101414185200001,"nyxId":2014101412102100001,"player":{"accountid":111445095,"firstname":"Dsfasdfds","lastname":"Fsdfsd","nickname":"Dsfasdfds F","zip":"fdsf","currency":"GBP","language":"EN","country":"GB","city":"dsfds","sex":"F","operatorid":118},"channel":"I","endTime":"2014-10-14T14:18:52.000+0000","ip":null}}
{"_type":"LOGIN","event":{"eventId":2014101414190700001,"nyxId":2014101414190700001,"player":{"accountid":114890855,"firstname":"Edict","lastname":"Test","nickname":"Edict T","zip":"20255","currency":"EUR","language":"SV","country":"DE","city":"Hamburg","sex":"M","operatorid":170},"channel":"I","endTime":"2014-10-14T17:19:07.000+0000","ip":"80.153.75.159"}}*/




/*var msg = new ClientMessage(object);
        	console.log("Asserting");
        	clientSession.assert(new ClientMessage(JSON.parse(message)));
        	clientSession.on("assert", function(fact) {
        		console.log("Something was indeed asserted: " + fact);
        	});
        	clientSession.on("modify", function(fact) {
        		console.log("Something was indeed modified: " + JSON.stringify(fact));
        		return true;
        	});
        	var matchResult = clientSession.match(function(err) {
        		console.log("Matching done");
        		if (err) {
        			console.error(err.stack);
        		} else {
        			console.log("done");
        		}
        	});*/