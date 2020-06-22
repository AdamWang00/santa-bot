# santa-bot
Discord bot supporting Youtube music search/streaming, a customizable hangman game, and Discord server management tools.

To use, create environment variables ```DISCORD_BOT_TOKEN``` and ```GOOGLE_API_KEY``` for your Discord bot's token and your Google API key respectively. Make sure you have run ```npm install``` and that you have ffmpeg installed (```sudo apt-get install ffmpeg```). Then run ```node bot.js```.

# bugs
Some Youtube videos have problems loading, resulting in the bot disconnecting from the voice channel prematurely. ```npm update``` seems to be useful.