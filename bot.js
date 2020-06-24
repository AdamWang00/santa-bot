const { Client, Util } = require('discord.js');
const { TOKEN, PREFIX, GOOGLE_API_KEY, HANGMAN_LIST, HANGMAN } = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');

const client = new Client({ disableEveryone: true });
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();

const hangmanList = HANGMAN_LIST;
const hangman = HANGMAN;


client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Ready!'));

client.on('disconnect', () => console.log('Disconnected'));

client.on('reconnecting', () => console.log('Reconnecting'));

client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	};

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(PREFIX.length);

	if (command === 'search') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('You need to be in a voice channel to play music!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					let index = 0;
					msg.channel.send(`
__**Song selection:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Please provide a value to select one of the search results ranging from 1-10.
					`);
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('No or invalid value entered, cancelling video selection.');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('I could not obtain any search results.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'play') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('You need to be in a voice channel to play music!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');
		}
		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 1);
					var video = await youtube.getVideoByID(videos[0].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send('I could not obtain any search results.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'skip') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		serverQueue.connection.dispatcher.end('Skip command has been used!');
		return undefined;
	} else if (command === 'stop') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Stop command has been used!');
		return undefined;
	} else if (command === 'volume') {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`Volume set to: **${args[1]}**`);
	} else if (command === 'list') {
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		return msg.channel.send(`
__**Song queue:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Now playing:** ${serverQueue.songs[0].title}
		`);
	} else if (command === 'pause') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('⏸ Paused');
		}
		return msg.channel.send('There is nothing playing.');
	} else if (command === 'resume') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('▶ Resumed');
		}
		return msg.channel.send('There is nothing playing.');
	} else if (command === 'negev') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('You need to be in a voice channel to play music!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');
		} else {
			var video = await youtube.getVideo("https://www.youtube.com/watch?v=csHhuxkZ9Q4");
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === 'coinflip') {
		if (Math.random() < 0.5)
			return msg.channel.send('Heads')
		return msg.channel.send('Tails')
	} else if (command === 'hangman') {
		var guesses = 6;
		var guessedLetters = '';
		const wordStr = hangmanList[(Math.floor(Math.random() * hangmanList.length))];
		const wordLength = wordStr.length;
		const word = [];
		var display = '';

		for (i = 0; i < wordLength; i++) {
			word[i] = wordStr.charAt(i);
			if (word[i] == ' ') {
				display += ' ';
			} else {
				display += '-';
			}
		}
		msg.channel.send('>>> Your word: ' + display + '\nYou have ' + guesses + ' guesses.\nGuess a letter.');

		while (guesses > 0) {
			var guess = '';
			while (guess == '') {
				try {
					var response = await msg.channel.awaitMessages(msg2 => msg2.content.length == 1 && msg2.content.match(/[a-z]/i), {
						maxMatches: 1,
						time: 30000,
						errors: ['time']
					});
				} catch (err) {
					console.error(err);
					return msg.channel.send('>>> No letter entered. Game aborted.');
				}

				if (guessedLetters.indexOf(response.first().content.toLowerCase()) == -1) {
					guess = response.first().content.toLowerCase();
					guessedLetters = guessedLetters + guess + ' ';
				} else {
					msg.channel.send('>>> You already guessed "' + response.first().content.toLowerCase() + '". Guess another letter.');
				}
			}

			var found = false;
			var foundCount = 0;
			for (i = 0; i < wordLength; i++) {
				if (guess == word[i] || guess.toUpperCase() == word[i]) {
					display = display.substring(0, i) + word[i] + display.substring(i + 1, wordLength);
					found = true;
					foundCount += 1;
				}
			}

			if (found) {
				if (display == wordStr) {
					msg.channel.send(hangman[6-guesses]);
					return msg.channel.send('>>> **You correctly guessed the word "' + wordStr + '" with ' + guesses + ' guesses remaining!**');
				} else {
					msg.channel.send('>>> ' + foundCount + ' "' + guess + '" found!\nYour word: ' + display + '\nGuesses: ' + guesses + ' remaining\nGuessed letters: ' + guessedLetters + '\nGuess a new letter.');
				}
			} else {
				guesses -= 1;
				if (guesses == 0) {
					msg.channel.send(hangman[6]);
					return msg.channel.send('>>> **You failed to guess the word "' + wordStr + '". You ended with "' + display + '".**');
				}
				msg.channel.send('>>> "' + guess + '" was not found.\nYour word: ' + display + '\nGuesses: ' + guesses + ' remaining\nGuessed letters: ' + guessedLetters + '\nGuess a new letter.');
			}
		}

		return msg.channel.send('Error');

	} else if (command === 'help') {
		return msg.channel.send('Prefix: ' + PREFIX + '\nCommands: search, play, skip, stop, volume, list, pause, resume, negev, coinflip, hangman')
	} else if (command === 'a') {
		var x = 1
		while (true) {
			await sleep(1000);

			m = ""
			for (var i = 0; i<x; i++) {
				m += "?"
			}
			msg.channel.send(m);
			x++
		}
	} else if (command === 'del') {
		await msg.delete();
		const fetched = await msg.channel.fetchMessages({limit: args[1] ? args[1] : 1});
		console.log(fetched.size + ' message(s) to be deleted.');
		msg.channel.bulkDelete(fetched)
			.catch(error => console.log(`[ERROR]: ${error}`));
		return;
	}
	msg.delete();
	return msg.channel.send(command);
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`I could not join the voice channel: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		if (song.title !== "NEGEV sound is different in Laser mode") {
			return msg.channel.send(`✅ **${song.title}** queued`);
		}
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url, {
		filter: "audioonly",
		quality: "highestaudio",
		highWaterMark: 1 << 18, // about 250 kilobytes
	}))
		.on('end', reason => {
			console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));

	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	if (song.title !== "NEGEV sound is different in Laser mode") {
		serverQueue.textChannel.send(`🎶 **${song.title}**`);
	}
}

client.login(TOKEN);