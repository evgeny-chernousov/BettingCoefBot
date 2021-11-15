"use strict";
exports.__esModule = true;
require("telegraf");
var telegraf_1 = require("telegraf");
var telegramToken = '2111141890:AAG5Lh432dr4-RKhBQq1vxiKF_1auezYutM';
var currency = 'EUR';
var houseCommission = 0.10; // example 0.10 - 10% from profit coefficient part
var bettors = [];
var players = [];
var isGameCreated = false;
var Player = /** @class */ (function () {
    function Player() {
        this.totalAmount = 0;
        this.coefficient = 0;
    }
    Player.prototype.calculateCoef = function (anotherPlayer) {
        if (this.totalAmount === 0 || anotherPlayer.totalAmount === 0) {
            return 0;
        }
        this.coefficient = ((1 + (anotherPlayer.totalAmount / this.totalAmount) * (1 - houseCommission))); // 1 + profit coef part * house commoission
        this.coefficient = Math.round(this.coefficient * 100 + Number.EPSILON) / 100; // round to 2 digits
        if (this.coefficient < 1) {
            this.coefficient = 1;
        }
        return this.coefficient;
    };
    return Player;
}());
var Bettor = /** @class */ (function () {
    function Bettor(name) {
        this.name = name;
        this.initialStake = 0;
        this.chosenPlayer = null;
    }
    Bettor.prototype.betToPlayer = function (amount, player) {
        if ((amount + this.initialStake) < 0) {
            return false;
        }
        this.chosenPlayer = player.name;
        this.initialStake += amount;
        player.totalAmount += amount;
    };
    return Bettor;
}());
var player1 = new Player();
var player2 = new Player();
var getBettorsForPlayer = function (player) {
    var string = "Bettors to " + player.name + " have steakes: ";
    for (var i = 0; i < bettors.length; i++) {
        if (bettors[i].chosenPlayer === player.name) {
            string += "\n" + bettors[i].name + " = " + bettors[i].initialStake + " " + currency + ".";
        }
    }
    string += "\nIn case of player " + player.name + " win, bettors will get: ";
    for (var i = 0; i < bettors.length; i++) {
        if (bettors[i].chosenPlayer === player.name) {
            string += "\n" + bettors[i].name + " = " + bettors[i].initialStake * player.coefficient + " " + currency + ".";
        }
    }
    return string;
};
var botHelp = function (ctx) {
    ctx.reply("Welcome! The bot helps to calculate coefficients and amounts for friendly game betting. \n    Players and bettors should persist in telegram group. The bot works with telegram usernames.\n    To start new game, please type /game and specify players by telegram usernames through space. Example: /game @stalin @trump.\n    After, you can bet for the player, added to the game. Example: /bet @stalin 10.\n    If both players get bets, you can use /result command see coefficients, current bettors steaks and estimated bettors earnings in case of their player win.");
};
var initGame = function (ctx) {
    //clean previous game data
    isGameCreated = false;
    bettors.length = 0;
    players.length = 0;
    var messageGame = ctx.update.message.text.replace(/\s{2,}/g, ' ').split(' '); // remove commas and spaces
    if (messageGame[1] && messageGame[2]) {
        player1.name = messageGame[1];
        player2.name = messageGame[2];
        players.push(player1);
        players.push(player2);
        isGameCreated = true;
        ctx.reply('Ok, now you can bet to the players. Please type /bet and specify username and amount through space. Example: /bet @stalin 10');
    }
    else {
        ctx.reply('Wrong format, please try again. Example: /game @stalin @trump');
        return null;
    }
};
var initBet = function (ctx) {
    if (isGameCreated === false) {
        ctx.reply("You need to create a game first, please see example: /game @stalin @trump. Or get /help.");
        return null;
    }
    var messageBet = ctx.update.message.text.replace(/\s{2,}/g, ' ').split(' '); // convert string to array, remove commas and spaces  
    var playerName = messageBet[1];
    var betAmount = Number(messageBet[2]);
    if (!betAmount || isNaN(betAmount)) {
        ctx.reply('Please specify correct amount');
        return null;
    }
    var bettor = new Bettor("@" + ctx.from.username);
    //check, if bettor already exist. If not - add him to bettors array. If yes - link current bettor with exisitg
    if (bettors.length === 0) {
        bettors.push(bettor);
    }
    else {
        var isBettorExist = false;
        for (var i = 0; i < bettors.length; i++) {
            if (bettors[i].name == bettor.name) {
                bettor = bettors[i];
                isBettorExist = true;
            }
        }
        if (isBettorExist === false) {
            bettors.push(bettor);
        }
    }
    //validation checks if bettor already have chosen player and he is different
    if (bettor.chosenPlayer && bettor.chosenPlayer != playerName) {
        ctx.reply("You already bet to player " + bettor.chosenPlayer);
        return null;
    }
    //amount and format validation
    if (playerName === player1.name) {
        if (bettor.betToPlayer(betAmount, player1) == false) {
            ctx.reply("Incorrect amount");
            return null;
        }
    }
    else if (playerName === player2.name) {
        if (bettor.betToPlayer(betAmount, player2) === false) {
            ctx.reply("Incorrect amount");
            return null;
        }
    }
    else {
        ctx.reply("Wrong format or unknown player used. Please choose player username from last created game: " + player1.name + " or " + player2.name + ". Example: /bet @stalin 10");
        return null;
    }
    player1.calculateCoef(player2);
    player2.calculateCoef(player1);
    var messageReply = bettor.name + ", your bet " + betAmount + " " + currency + " to " + playerName + " was received. \n    Your total steak = " + bettor.initialStake + " " + currency;
    if (player1.coefficient > 0 && player2.coefficient > 0) {
        messageReply += "\nPlayers coefficients: " + player1.name + " - " + player1.coefficient + ", " + player2.name + " - " + player2.coefficient;
    }
    ctx.reply(messageReply);
};
var getBetsResult = function (ctx) {
    if (isGameCreated === false) {
        ctx.reply("You need to create a game first, please see example: /game @stalin @trump. Or get /help.");
        return null;
    }
    else if (player1.coefficient > 0 && player2.coefficient > 0) {
        ctx.reply("\n        " + getBettorsForPlayer(player1) + "\n        " + getBettorsForPlayer(player2) + "\n        ");
    }
    else {
        ctx.reply("Both players must get bets first");
        return null;
    }
};
var bot = new telegraf_1.Telegraf(telegramToken);
bot.help(function (ctx) { return botHelp(ctx); });
bot.command('/game', function (ctx) { return initGame(ctx); });
bot.command('/bet', function (ctx) { return initBet(ctx); });
bot.command('/result', function (ctx) { return getBetsResult(ctx); });
bot.launch();
