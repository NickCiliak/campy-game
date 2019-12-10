/**
 * TODO
 * - sound effects for coins, losing, music?
 * - adjust platform spacing and heights
 * - make more difficult as time goes on
 * - 3 CXA coins for power up mode
 * - title screen
 * - iphone height is too tall, causes scrollbar
 * - make background scroll
 */

import Phaser from 'phaser';

import bgSprite from '../../assets/bg2.png';
import campySprite from '../../assets/CampyWalk3.png';
import coinSprite from '../../assets/coin.png';
import p1Sprite from '../../assets/p1.png';
import p2Sprite from '../../assets/p2.png';
import p3Sprite from '../../assets/p3.png';
import coinSound from '../../assets/coin.mp3';
import jumpSound from '../../assets/jump.mp3';

let gameOptions = {
	playerStartPosition: 200,
	playerStartHeight: 600,
	platformStartHeight: 720,
	playerGravity: 900,
	platformStartSpeed: 200,
	spawnRange: [50, 100],
	// platformSizeRange: [100, 250],
	platformHeightRange: [-50, 50],
	jumpForce: 400,
	jumps: 2,
	platformHeightScale: 2,
	platformVerticalLimit: [.2, .8],
	coinChance: 2
}

export default class Game extends Phaser.Scene {
	constructor() {
		super({ key: 'CampyGame' });
	}

	preload() {
		this.load.image('bg', bgSprite);
		this.load.image('p1', p1Sprite);
		this.load.image('p2', p2Sprite);
		this.load.image('p3', p3Sprite);
		this.load.audio('coin', coinSound);
		this.load.audio('jump', jumpSound);
		this.load.spritesheet('coin', coinSprite, { frameWidth: 144, frameHeight: 144 });
		// this.load.spritesheet('campy', campySprite, { frameWidth: 175, frameHeight: 240 });
		this.load.spritesheet('campy', campySprite, { frameWidth: 182, frameHeight: 236 });
	}

	create() {
		// alias the config
        this.config = this.sys.game.config;

        // setup sounds
        this.coinSound = this.sound.add('coin');
        this.jumpSound = this.sound.add('jump');

		// this.bg = this.add.image(this.config.width * 0.5, this.config.height * 0.5, 'bg');
		this.bg = this.physics.add.sprite(0, this.config.height * .5, 'bg');
		this.bg.setDisplaySize(1810, 1280);
		// this.bg.setScale(.9);
		// this.bg.setRotation(3.14159);

		// this.bgGroup = this.add.group();

		this.score = 0;
		this.scoreText = this.add.text(16, 16, '0', { fontSize: '64px', fill: '#FFF', fontFamily: 'Poppins' });

		// create platform group
		this.platformGroup = this.add.group();

		// create coins group
		this.coinGroup = this.add.group();

		// add a platform
		this.addPlatform(3, this.config.width / 2, gameOptions.platformStartHeight);

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
			frames: this.anims.generateFrameNumbers('campy', { start: 1, end: 12 }),
			frameRate: 12,
			repeat: -1
		});

		this.anims.create({
			key: 'jump',
			frames: this.anims.generateFrameNumbers('campy', { start: 7, end: 7 }),
			frameRate: 12,
			repeat: -1
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

			this.addPlatform(nextPlatformWidth, this.config.width + nextPlatformWidth / 2, nextPlatformHeight);
		}
	}

	// the core of the script: platform are added from the pool or created on the fly
	addPlatform(platformWidth, posX, posY) {
		// console.log(platformWidth, posX, posY);
		let sprite = 'p1';
		if (platformWidth === 1) {
			sprite = 'p1';
		}
		if (platformWidth === 2) {
			sprite = 'p2';
		}
		if (platformWidth === 3) {
			sprite = 'p3';
		}

		let platform = this.physics.add.sprite(posX, posY, sprite);
		platform.setImmovable(true);

		if (this.gameHasStarted) {
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
		}

		this.platformGroup.add(platform);
		platform.setScale(.5);
		// platform.displayWidth = 350;
		this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
		this.lastPlatformHeight = posY;

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

		// start moving the existing platforms
		this.platformGroup.getChildren().forEach(function(platform) {
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
		});

		// start moving the existing coins
		this.coinGroup.getChildren().forEach(function(coin) {
			coin.setVelocityX(gameOptions.platformStartSpeed * -1);
		});

		// play the campy walking animation
		this.player.anims.play('walk', true);
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
