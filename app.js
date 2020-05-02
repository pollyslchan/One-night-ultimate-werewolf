var express = require("express");
var app = express();
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");

mongoose.connect("mongodb+srv://polly:Hku123456@cluster0-82fjk.mongodb.net/test?retryWrites=true&w=majority", {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
}).then(() => {
	console.log("Connected to DB");
}).catch(err => {
	console.log("Error:", err.message);
});
mongoose.set('useFindAndModify', false);
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));

//Testing database connection
// var PostSchema = new mongoose.Schema({
// 	title: String,
// 	description: String,
// });
// var Post = mongoose.model("Post", PostSchema);
// app.get("/", async (req, res) => {
// 	let post = await Post.create({title: "Test", description: "This is a test also"});
// 	res.send(post);
// });

//Schema setup
var playerSchema = new mongoose.Schema({
	name: String,
	role1: String,
	role2: String,
	votes: Number,
});
var Player = mongoose.model("Player", playerSchema);

var characters = ["werewolf", "werewolf", "minion", "seer", "robber", "villager", "villager"];

app.get("/", function(req, res){
	res.render("landing");
});

app.get("/players", function(req, res){
	Player.find({}, function(err, allPlayers){
		if(err){
			console.log(err);
		} else{
			res.render("players", {players:allPlayers});
		}
	});
});

app.post("/players", function(req, res){
	var name = req.body.name;
	var newPlayer = {name: name, role1: null, role2: null, votes: 0};
	Player.create(newPlayer, function(err, player){
		if(err){
			console.log(err);
		} else{
			res.redirect("/players");
		}
	});
});

app.delete("/players", function(req, res){
	Player.remove({}, function(err){
		if(err){
			console.log(err);
			res.redirect("/players");
		} else{
			res.redirect("/");
		}
	});
});

app.get("/day1", function(req, res){
	Player.find({}, function(err, allPlayers){
		if(err){
			console.log(err);
		} else{
			res.render("day1", {players:allPlayers});
		}
	});
});

app.put("/initialise", function(req, res){
	//shuffle order of characters to be assigned to players
	var randomCharacters = characters;
	function shuffle(array) {
  		var currentIndex = array.length, temporaryValue, randomIndex;
		while (0 !== currentIndex) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}
		return array;
	};
	shuffle(randomCharacters);
	
	//If there are 4 players, initialise all players for roles and votes
	Player.find({}, function(err, allPlayers){
		if(err){
			console.log(err);
		} else if(allPlayers.length == 4){
			allPlayers.forEach(async function(player, i){
				await Player.findOneAndUpdate({_id : player._id}, {role1 : randomCharacters[i], role2: randomCharacters[i], votes: 0}, function(err, player){
					if(err){
						console.log(err);
					} 
				});
			});
			res.redirect("/players");
		} else{
			res.redirect("/players");
		}
	});
});

app.get("/role/:id", function(req, res){
	Player.findById(req.params.id, function(err, foundPlayer){
		if(err){
			console.log(err);
		} else{
			res.render("role", {player:foundPlayer});
		}
	});
});

app.get("/night1", function(req, res){
	Player.find({}, function(err, allPlayers){
		if(err){
			console.log(err);
		} else{
			console.log(allPlayers);
			res.render("night1", {players:allPlayers});
		}
	});
});

app.get("/action/:id", function(req, res){
	Player.findById(req.params.id, function(err, foundPlayer){
		if(err){
			console.log(err);
		} else if(foundPlayer.role1 == "seer"){
			Player.find({}, function(err, allPlayers){
				if(err){
					console.log(err);
				} else{
					res.render("action-seer", {players:allPlayers});
				}
			});
		} else if(foundPlayer.role1 == "robber"){
			Player.find({}, function(err, allPlayers){
				if(err){
					console.log(err);
				} else{
				res.render("action-robber", {players:allPlayers});
				}
			});
		} else if(foundPlayer.role1 == "werewolf" || foundPlayer.role1 == "minion"  ){
			Player.find({}, function(err, allPlayers){
				if(err){
					console.log(err);
				} else{
				res.render("action-wolves", {players:allPlayers});
				}
			});
		} else{ 
			res.render("action-none");
		}
	});
});

app.get("/rolecheck/:id", function(req, res){
	Player.findById(req.params.id, function(err, foundPlayer){
		if(err){
			console.log(err);
		} else{
			res.render("role-check", {player:foundPlayer});
		}
	});
});

app.put("/rolecheck/:id", async function(req, res){
	await Player.findOneAndUpdate({_id : req.params.id}, {role2 : "robber"}, async function(err, foundPlayer){
		if(err){
			console.log(err);
		} else{
			await Player.findOneAndUpdate({role1 : "robber"}, {role2: foundPlayer.role1}, function(err, player){
				if(err){
					console.log(err)
				} else {
					res.render("role-check", {player:foundPlayer});
				}
			});				
		}
	});
});

app.get("/day2", function(req, res){
	Player.find({}, function(err, allPlayers){
		if(err){
			console.log(err);
		} else{
			res.render("day2", {players: allPlayers});
		}
	});
});


app.put("/vote/:id", function(req, res){
	Player.findByIdAndUpdate(req.params.id, {$inc: {votes : 1}}, function(err, foundPlayer){
		if(err){
			console.log(err);
		} else{			
			res.render("voted", {player:foundPlayer});
		}
	});
});

app.get("/results", function(req, res){
	Player.find({}, function(err, allPlayers){
		if(err){
			console.log(err);
		} else{
			var maxVote = 0;
			var villagerWin = false;
			maxVote = Math.max.apply(Math, allPlayers.map(function(o) { return o.votes; }));
			allPlayers.forEach(function(player){
				if(player.role2 == "werewolf" && player.votes == maxVote){
					villagerWin = true;
				}
			});
			res.render("results", {players:allPlayers, villagerWin:villagerWin});
		}
	});
});

app.listen(3000, function(){
	console.log("Server listening on port 3000")
});