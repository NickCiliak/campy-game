/**
 * TODO
 * - adjust platform spacing and heights //
 * - make more difficult as time goes on //
 * - make it save high score //
 * - music?
 * - title screen & score graphics
 * - bug where platform not smoothly entering from right //
 * - make background scroll
 * - iphone height is too tall, causes scrollbar
 * - 3 CXA coins for power up mode
 */

import Phaser from 'phaser';

import bgSprite from '../../assets/bg3.png';
import campySprite from '../../assets/campyfull.png';
import coinSprite from '../../assets/coin.png';
import bannerSprite from '../../assets/banner.png';
import p1Sprite from '../../assets/p1.png';
import p2Sprite from '../../assets/p2.png';
import p3Sprite from '../../assets/p3.png';
import coinSound from '../../assets/coin.mp3';
import jumpSound from '../../assets/jump.mp3';
import fallSound from '../../assets/fall.mp3';

let gameOptions = {
	playerStartPosition: 200,
	playerStartHeight: 600,
	platformStartHeight: 720,
	playerGravity: 900,
	platformStartSpeed: 250,
	// spawnRange: [50, 200],
	spawnRange: [-100, 50],
	platformHeightRange: [-50, 50],
	jumpForce: 400,
	jumps: 2,
	platformHeightScale: 2,
	platformVerticalLimit: [.4, .8],
	coinChance: 2,
	backgroundSpeedReducer: .5,
	bgWidth: 2591
}

export default class Game extends Phaser.Scene {
	constructor() {
		super({ key: 'CampyGame' });
	}

	preload() {
		this.load.image('bg', bgSprite);
		this.load.image('banner', bannerSprite);
		this.load.image('p1', p1Sprite);
		this.load.image('p2', p2Sprite);
		this.load.image('p3', p3Sprite);
		this.load.audio('coin', coinSound);
		this.load.audio('jump', jumpSound);
		this.load.audio('fall', fallSound);
		this.load.spritesheet('coin', coinSprite, { frameWidth: 144, frameHeight: 144 });
		// this.load.spritesheet('campy', campySprite, { frameWidth: 182, frameHeight: 236 }); // without jump
		this.load.spritesheet('campy', campySprite, { frameWidth: 208, frameHeight: 236 });
	}

	create() {

		this.platformSpriteOptions = [
			{
				id: 'p1',
				levels: '3456'
			},
			{
				id: 'p2',
				levels: '23'
			},
			{
				id: 'p3',
				levels: '12'
			},
		]
		// alias the config
		this.config = this.sys.game.config;

		// setup sounds
		this.coinSound = this.sound.add('coin');
		this.jumpSound = this.sound.add('jump');
		this.fallSound = this.sound.add('fall');

		this.bg1 = this.physics.add.sprite(gameOptions.bgWidth * .5, this.config.height * .5, 'bg');
		this.bg1.setDisplaySize(gameOptions.bgWidth, 1280);
		this.bg2 = this.physics.add.sprite(gameOptions.bgWidth + gameOptions.bgWidth  * .5, this.config.height * .5, 'bg');
		this.bg2.setDisplaySize(gameOptions.bgWidth, 1280);

		this.banner = this.physics.add.sprite(this.config.width * .5, 0, 'banner');
		// this.bannerBottom = this.physics.add.sprite(this.config.width * .5, this.config.height, 'banner');
		// this.bannerBottom.setRotation(3.14159);
		// this.banner.setDisplaySize(1810, 1280);

		this.score = 0;
		this.scoreText = this.add.text(32, 40, '0', { fontSize: '72px', fill: '#FFF', fontFamily: 'Poppins' });


		let highScore = this.getHighScoreFromStorage();
		if (highScore) {
			this.add.text(this.config.width - 100, 40, '0', { fontSize: '24px', fill: '#FFF', fontFamily: 'Poppins' }).setText('HIGH');
			this.highScoreText = this.add.text(this.config.width - 100, 70, '0', { fontSize: '36px', fill: '#FFF', fontFamily: 'Poppins' });
			this.highScoreText.setText(highScore);
		}

		// create platform group
		this.platformGroup = this.add.group();

		// create coins group
		this.coinGroup = this.add.group();

		// add a platform
		this.addPlatform(3, this.config.width * .5, gameOptions.platformStartHeight);
		this.addPlatform(3, this.config.width * .85, gameOptions.platformStartHeight + Phaser.Math.Between(-80, 80)); // add second platform

		// add a player
		this.playerJumps = 0;
		this.player = this.physics.add.sprite(this.config.width * .5, gameOptions.playerStartHeight, 'campy');
		this.player.setFrame(2);

		this.player.setGravityY(gameOptions.playerGravity);
		this.player.setDisplaySize(84, 116); // 504 w
		// this.player.displayWidth = 42;
		// this.player.displayHeight = 58;

		// campy animations
		this.anims.create({
			key: 'walk',
			frames: this.anims.generateFrameNumbers('campy', { start: 1, end: 8 }),
			frameRate: 12,
			repeat: -1
		});

		this.anims.create({
			key: 'jump',
			frames: this.anims.generateFrameNumbers('campy', { start: 8, end: 11 }),
			frameRate: 12,
			repeat: 0
		});

		this.anims.create({
			key: 'coin',
			frames: this.anims.generateFrameNumbers('coin', { start: 1, end: 5 }),
			frameRate: 12,
			repeat: -1
		});

		// add controls
		this.input.on('pointerdown', this.jump, this);
		this.input.keyboard.on('keydown-SPACE', this.jump, this);

		// set collision between Campy and platforms
		this.physics.add.collider(this.player, this.platformGroup);

		this.physics.add.overlap(this.player, this.coinGroup, this.collectCoin, null, this);
	}

	gameOver() {
		let highScore = this.getHighScoreFromStorage();

		if (this.score > highScore) {
			localStorage.setItem('campy-high-score', this.score);
			this.highScore = this.score;
		}

		this.fallSound.play();
		this.gameHasStarted = false;
		this.scene.start("CampyGame");
	}

	update() {
		// game over
		if (this.player.y > this.config.height) {
			this.gameOver();
		}

		// keep Campy in the same x position
		this.player.x = this.config.width * .5;

		// recycling platforms
		let minDistance = this.config.width;
		let rightmostPlatformHeight = this.lastPlatformHeight;
		this.platformGroup.getChildren().forEach(function (platform) {
			let platformDistance = this.config.width - platform.x - platform.displayWidth / 2;
			minDistance = Math.min(minDistance, platformDistance);
			if (platformDistance < minDistance) {
				minDistance = platformDistance;
				// rightmostPlatformHeight = platform.y;
			}
			if (platform.x < - platform.displayWidth / 2) {
				this.platformGroup.killAndHide(platform);
				this.platformGroup.remove(platform);
			}
		}, this);

		// check for touching the platform to set to walking
		if (this.gameHasStarted && this.player.body.touching.down) {
			this.player.anims.play('walk', true);
		}

		// adding new platforms
		if (minDistance > this.nextPlatformDistance) {
			// let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
			let nextPlatformWidth = Phaser.Math.RND.pick([1, 2, 3]);
			let platformRandomHeight = gameOptions.platformHeightScale * Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]);

			let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;

			let minPlatformHeight = this.config.height * gameOptions.platformVerticalLimit[0];
			let maxPlatformHeight = this.config.height * gameOptions.platformVerticalLimit[1];

			let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);

			this.addPlatform(nextPlatformWidth, this.config.width + 150, nextPlatformHeight);
		}

		// console.log(this.b g1.x, this.bg2.x);
		// leap frog the backgrounds
		if (this.bg1.x <= gameOptions.bgWidth * -.5) {
			console.log('yeh 1');
			this.bg1.setPosition(gameOptions.bgWidth + gameOptions.bgWidth * .5 - 10, this.config.height * .5);
		}
		if (this.bg2.x <= gameOptions.bgWidth * - .5 ) {
			console.log('mmm 2');
			this.bg2.setPosition(gameOptions.bgWidth + gameOptions.bgWidth * .5 - 10  , this.config.height * .5);
		}
	}

	getHighScoreFromStorage() {
		let value = localStorage.getItem('campy-high-score');

		if (isNaN(value)) {
			return 0;
		}

		return value;
	}

	addPlatform(platformWidth, posX, posY) {
		// todo - not using platformWidth param anymore

		let currentLevel = this.getDifficultyLevel();

		let spriteOptionsBasedOnLevel = this.platformSpriteOptions.filter(function(spr) {
			return spr.levels.indexOf(currentLevel) !== -1;
		});

		let chosenPlatform = Phaser.Math.RND.pick(spriteOptionsBasedOnLevel);

		let platform = this.physics.add.sprite(posX, posY, chosenPlatform.id);
		platform.setImmovable(true);

		if (this.gameHasStarted) {
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
		}

		this.platformGroup.add(platform);
		platform.setScale(.5);
		// platform.displayWidth = 350;

		let initialSpawnRangeBasedOnLevel = gameOptions.spawnRange[0] + currentLevel * .8;
		let endRangeBasedOnLevel = gameOptions.spawnRange[1] + currentLevel * 1.2;

		this.nextPlatformDistance = Phaser.Math.Between(initialSpawnRangeBasedOnLevel, endRangeBasedOnLevel);
		this.lastPlatformHeight = posY;

		console.log(this.nextPlatformDistance);

		// don't add a coin on the first platform
		if (this.platformGroup.getLength() > 1 && (Phaser.Math.Between(0, 1) * gameOptions.coinChance > 0)) {
			this.addCoin(posX, posY - 60);
		}
	}

	addCoin(posX, posY) {
		let coin = this.physics.add.sprite(posX, posY, 'coin');
		coin.setDisplaySize(36, 36, true);
		coin.anims.play('coin');

		if (this.gameHasStarted) {
			coin.setVelocityX(gameOptions.platformStartSpeed * -1);
		}

		this.coinGroup.add(coin);
	}

	collectCoin(player, coin) {
		coin.disableBody(true, true);
		this.coinSound.play();
		this.score += 10;
		this.scoreText.setText(this.score);
	}

	startGame() {
		this.gameHasStarted = true;
		this.startTime = Date.now();

		// start moving the existing platforms
		this.platformGroup.getChildren().forEach(function (platform) {
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
		});

		// start moving the existing coins
		this.coinGroup.getChildren().forEach(function (coin) {
			coin.setVelocityX(gameOptions.platformStartSpeed * -1);
		});

		// start moving the backgrounds
		this.bg1.setVelocityX(gameOptions.platformStartSpeed * -1 * gameOptions.backgroundSpeedReducer);
		this.bg2.setVelocityX(gameOptions.platformStartSpeed * -1 * gameOptions.backgroundSpeedReducer);

		// play the campy walking animation
		this.player.anims.play('walk', true);
	}

	getSecondsSinceStartTime() {
		return Math.floor((Date.now() - this.startTime) / 1000);
	}

	getDifficultyLevel() {
		if (!this.gameHasStarted) {
			return 1;
		}

		let sec = this.getSecondsSinceStartTime();

		if (sec > 90) {
			console.log('level 6 !!!!!');
			return 6;
		}

		if (sec > 60) {
			console.log('level 5');
			return 5;
		}

		if (sec > 45) {
			console.log('level 4');
			return 4;
		}


		if (sec > 30) {
			// console.log('level 3');
			return 3;
		}

		if (sec > 10) {
			// console.log('level 2');
			return 2;
		}

		// console.log('level 1');
		return 1;
	}

	jump() {
		if (!this.gameHasStarted) {
			this.startGame();
			return;
		}

		if (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)) {
			if (this.player.body.touching.down) {
				this.playerJumps = 0;
			}
			this.player.setVelocityY(gameOptions.jumpForce * -1);
			this.player.anims.play('jump', true);
			this.jumpSound.play();
			this.playerJumps++;
		}
	}
}
