var fs = require('fs');

exports.TOKEN = process.env.DISCORD_BOT_TOKEN;

exports.PREFIX = '=';

exports.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

exports.HANGMAN_LIST = fs.readFileSync('hangmanWords.txt').toString().split('\r\n');

exports.HANGMAN = fs.readFileSync('hangman.txt').toString().split('&');