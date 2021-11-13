telegramToken = '';
currency = 'EUR';
houseCommission = 0.10; // example 0.10 - 10% from profit coefficient part
bettors = [];
players =[];
isGameCreated = false;

class Player {
    constructor(name){
        this.name = name;
        this.totalAmount = 0;
        this.coefficient = null;
    }

    changeAmount(newAmount){
        this.totalAmount += newAmount;
    }

    calculateCoef(anotherPlayer){
        if (this.totalAmount ===0 || anotherPlayer.totalAmount ===0){
            return 'N/A'
        }
        let coeff = ((1 + (anotherPlayer.totalAmount/this.totalAmount)*(1 - houseCommission))).toFixed(2) // 1 + profit coef part * house commoission
        if (coeff < 1){
            return 1
        }
        this.coefficient = coeff;
        return coeff;
    }
}

class Bettor {
    constructor(name){
        this.name = name;
        this.initialStake = 0;
        this.chosenPlayer = null;
    }

    betToPlayer(amount, player){
        if((amount + this.initialStake)<0){
            return false;
        }
        this.initialStake += amount;
        player.changeAmount(amount);
    }
}

let getBettorsForPlayer = (player) => {
    let string = `Bettors to ${player.name} have steakes: `;
    for(i = 0; i<bettors.length; i++){
        if(bettors[i].chosenPlayer === player.name){
            string += `\n${bettors[i].name} = ${bettors[i].initialStake} ${currency}.`
        }
    }
    string += `\nIn case of player ${player.name} win, bettors will get: `;
    for(i = 0; i<bettors.length; i++){
        if(bettors[i].chosenPlayer === player.name){
            string += `\n${bettors[i].name} = ${bettors[i].initialStake * player.coefficient} ${currency}.`
        }
    }
    return string
}

let botHelp = (ctx) => {
    ctx.reply(`Welcome! 
	The bot helps to calculate coefficients and amounts for friendly game betting. 
    Players and bettors should persist in telegram group. The bot works with telegram usernames.
    To start new game, please type /game and specify players by telegram usernames through space. Example: /game @stalin @trump.
    After, you can bet for the player, added to the game. Example: /bet @stalin 10.
    If both players get bets, you can use /info command see coefficients, current bettors steaks and estimated bettors earnings in case of their player win.`)
}

let initGame = (ctx) => {
    //clean previous game data
    isGameCreated = false;
    bettors.length = 0;
    players.length = 0;

    let messageGame = ctx.update.message.text.replace(/\s{2,}/g, ' ').split(' '); // remove commas and spaces
    if(messageGame[1] && messageGame[2]){
        player1 = new Player(messageGame[1]);
        player2 = new Player(messageGame[2]);
        players.push(player1);
        players.push(player2);
        isGameCreated = true;
        ctx.reply('Ok, now you can bet to the players. Please type /bet and specify username and amount through space. Example: /bet @stalin 10')
    }
    else{
        ctx.reply('Wrong format, please try again. Example: /game @stalin @trump')
        return null
    }
}

let initBet = (ctx) => {
    if (isGameCreated === false){
        ctx.reply(`You need to create a game first, please see example: /game @stalin @trump. Or get /help.`)
        return null
    }

    messageBet = ctx.update.message.text.replace(/\s{2,}/g, ' ').split(' '); // remove commas and spaces
    betAmount = Number(messageBet[2]);

    if (!betAmount || isNaN(betAmount)) {
        ctx.reply('Please specify correct amount')
        return null
    }

    ctx.from.username = new Bettor(`@${ctx.from.username}`)
    if (bettors.length === 0){
        bettor = ctx.from.username
        bettors.push(bettor)
    }
    else{
        isBettorExist = 0
        for (i = 0; i < bettors.length; i++) {
            if (bettors[i].name == (ctx.from.username).name){
                isBettorExist = 1
            }
        }
        if (isBettorExist === 0){
            bettor = ctx.from.username
            bettors.push(bettor)
        }
    }
    playerName = messageBet[1];

    if (bettor.chosenPlayer && bettor.chosenPlayer != playerName){
        ctx.reply(`You already bet to player ${bettor.chosenPlayer}`)
        return null;
    }

    if(playerName === player1.name){
        //bettor.betToPlayer(betAmount, player1);
        if (bettor.betToPlayer(betAmount, player1) == false){
            ctx.reply(`Incorrect amount`);
            return null;
        }
        bettor.chosenPlayer = playerName
    }
    else if (playerName === player2.name) {
        //bettor.betToPlayer(betAmount, player2);
        if (bettor.betToPlayer(betAmount, player2) === false){
            ctx.reply(`Incorrect amount`);
            return null;
        }
        bettor.chosenPlayer = playerName
    }
    else{
        ctx.reply(`Wrong format or unknown player used. Please choose player username from last created game: ${player1.name} or ${player2.name}. Example: /bet @stalin 10`)
        delete (bettor)
        return null
    }
    ctx.reply(`${bettor.name}, your bet ${betAmount} ${currency} to ${playerName} was received. 
    Your total steak = ${bettor.initialStake} ${currency}. 
    Players coefficients: ${player1.name} - ${player1.calculateCoef(player2)}, ${player2.name} - ${player2.calculateCoef(player1)}`)
}   

let getBetsInfo = (ctx) => {
    if (isGameCreated === false){
        ctx.reply(`You need to create a game first, please see example: /game @stalin @trump. Or get /help.`)
        return null
    }
    if (player1.coefficient && player2.coefficient){
        ctx.reply(`Current coeffiients = ${player1.name} - ${player1.calculateCoef(player2)}, ${player2.name} - ${player2.calculateCoef(player1)}
        ${getBettorsForPlayer(player1)}
        ${getBettorsForPlayer(player2)}
        `)
    }
    else{
        ctx.reply(`Both players must get bets first`)
        return null
    }
}

const { Telegraf } = require('telegraf')
const bot = new Telegraf(telegramToken)

bot.help(ctx => botHelp(ctx));
bot.command('/game', ctx => initGame(ctx));
bot.command('/bet', ctx => initBet(ctx));
bot.command('/info', ctx => getBetsInfo(ctx));

bot.launch();