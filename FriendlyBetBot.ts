import 'telegraf';
import {Telegraf} from "telegraf";
let telegramToken: string  = '';
let currency: string = '';
let houseCommission: number  = ; // example 0.10 - 10% from profit coefficient part
let bettors: Array<Bettor> = [];
let players: Array<Player> =[];
let isGameCreated: boolean = false;

class Player {
    name: string;
    totalAmount: number = 0;
    coefficient: number = 0;
    calculateCoef(anotherPlayer): number{
        if (this.totalAmount ===0 || anotherPlayer.totalAmount === 0){
            return 0;
        }
        this.coefficient = ((1 + (anotherPlayer.totalAmount/this.totalAmount)*(1 - houseCommission))); // 1 + profit coef part * house commoission
        this.coefficient = Math.round(this.coefficient * 100 + Number.EPSILON) /100; // round to 2 digits
        if (this.coefficient < 1){
            this.coefficient = 1;
        }
        return this.coefficient;
    }
}

class Bettor {
    name: string;
    initialStake: number;
    chosenPlayer: string;
    constructor(name: string){
        this.name = name;
        this.initialStake = 0;
        this.chosenPlayer = null;
    }
    betToPlayer(amount, player): boolean{
        if((amount + this.initialStake)<0){
            return false;
        }
        this.chosenPlayer = player.name;
        this.initialStake += amount;
        player.totalAmount += amount;
    }
}

var player1 = new Player();
var player2 = new Player();

let getBettorsForPlayer = (player: Player) => { //returns string with list of bettors for player with current steaks and potential amounts
    let string: string = `Bettors to ${player.name} have steakes: `;
    for(let i = 0; i<bettors.length; i++){
        if(bettors[i].chosenPlayer === player.name){
            string += `\n${bettors[i].name} = ${bettors[i].initialStake} ${currency}.`
        }
    }
    string += `\nIn case of player ${player.name} win, bettors will get: `;
    for(let i = 0; i<bettors.length; i++){
        if(bettors[i].chosenPlayer === player.name){
            string += `\n${bettors[i].name} = ${bettors[i].initialStake * player.coefficient} ${currency}.`
        }
    }
    return string
}

let botHelp = (ctx) => {
    ctx.reply(`Welcome! The bot helps to calculate coefficients and amounts for friendly game betting. 
    Players and bettors should persist in telegram group. The bot works with telegram usernames.
    To start new game, please type /game and specify players by telegram usernames through space. Example: /game @stalin @trump.
    After, you can bet for the player, added to the game. Example: /bet @stalin 10.
    If both players get bets, you can use /result command see coefficients, current bettors steaks and estimated bettors earnings in case of their player win.`)
}

let initGame = (ctx) => {
    //clean previous game data
    isGameCreated = false;
    bettors.length = 0;
    players.length = 0;
    let messageGame = ctx.update.message.text.replace(/\s{2,}/g, ' ').split(' '); // remove commas and spaces
    if(messageGame[1] && messageGame[2]){
        player1.name = messageGame[1];
        player2.name = messageGame[2];
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
    let messageBet: Array<string> = ctx.update.message.text.replace(/\s{2,}/g, ' ').split(' '); // convert string to array, remove commas and spaces  
    let playerName: string = messageBet[1];
    let betAmount: number = Number(messageBet[2]);
    if (!betAmount || isNaN(betAmount)) {
        ctx.reply('Please specify correct amount')
        return null
    }
    let bettor: Bettor = new Bettor(`@${ctx.from.username}`);
    //check, if bettor already exist. If not - add him to bettors array. If yes - link current bettor with exisitg
    if (bettors.length === 0){
        bettors.push(bettor)
    }
    else{
        let isBettorExist: boolean = false
        for (let i = 0; i < bettors.length; i++) {
            if (bettors[i].name == bettor.name){
                bettor = bettors[i];
                isBettorExist = true;
            }
        }
        if (isBettorExist === false){
            bettors.push(bettor)
        }
    }
    //validation checks if bettor already have chosen player and he is different
    if (bettor.chosenPlayer && bettor.chosenPlayer != playerName){
        ctx.reply(`You already bet to player ${bettor.chosenPlayer}`)
        return null;
    }
    //amount and format validation
    if(playerName === player1.name){
        if (bettor.betToPlayer(betAmount, player1) == false){
            ctx.reply(`Incorrect amount`);
            return null;
        }
    }
    else if (playerName === player2.name) {
        if (bettor.betToPlayer(betAmount, player2) === false){
            ctx.reply(`Incorrect amount`);
            return null;
        }
    }
    else{
        ctx.reply(`Wrong format or unknown player used. Please choose player username from last created game: ${player1.name} or ${player2.name}. Example: /bet @stalin 10`)
        return null
    }
    player1.calculateCoef(player2)
    player2.calculateCoef(player1)
    let messageReply: string = `${bettor.name}, your bet ${betAmount} ${currency} to ${playerName} was received. 
    Your total steak = ${bettor.initialStake} ${currency}`
    if(player1.coefficient>0 && player2.coefficient>0){
        messageReply += `\nPlayers coefficients: ${player1.name} - ${player1.coefficient}, ${player2.name} - ${player2.coefficient}`
    }
    ctx.reply(messageReply)
}   

let getBetsResult = (ctx) => {
    if (isGameCreated === false){
        ctx.reply(`You need to create a game first, please see example: /game @stalin @trump. Or get /help.`)
        return null
    }else if (player1.coefficient>0 && player2.coefficient>0){
        ctx.reply(`
        ${getBettorsForPlayer(player1)}
        ${getBettorsForPlayer(player2)}
        `)
    }
    else{
        ctx.reply(`Both players must get bets first`)
        return null
    }
}
let bot = new Telegraf(telegramToken);
bot.help(ctx => botHelp(ctx));
bot.command('/game', ctx => initGame(ctx));
bot.command('/bet', ctx => initBet(ctx));
bot.command('/result', ctx => getBetsResult(ctx));
bot.launch();