var fs = require('fs');

exports.TOKEN = 'NTE2NDE0MzI2MzkxNzAxNTI0.XcN9Mg._sWWewITy5vGpYLZvqoXhEwaVBg';
//'NjMyNzUzMTc0OTM5MTcyODk1.XaLHhQ.kIqCZY9FgFAjyuFGOoKhyOEnpiQ';

exports.PREFIX = '=';

exports.GOOGLE_API_KEY = 'AIzaSyC_JCoSoTm8r0q7_3VXxwalzpj9IgXtYC0';

exports.HANGMAN_LIST = fs.readFileSync('hangmanWords.txt').toString().split('\r\n');

exports.HANGMAN = fs.readFileSync('hangman.txt').toString().split('&');