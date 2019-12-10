/**
 * TODO
 * - sound effects for coins, losing, music?
 * - adjust platform spacing and heights
 * - make more difficult as time goes on
 * - 3 CXA coins for power up mode
 * - title screen
 */

import Phaser from 'phaser';

import bgSprite from '../../assets/bg2.png';
import groundSprite from '../../assets/ground.png';
import campySprite from '../../assets/CampyWalkSmall.png';
import coinSprite from '../../assets/coin.png';
import p1Sprite from '../../assets/p1.png';
import p2Sprite from '../../assets/p2.png';
import p3Sprite from '../../assets/p3.png';

let gameOptions = {
	playerStartPosition: 100,
	playerStartHeight: 300,
	platformStartHeight: 360,
	playerGravity: 900,
	platformStartSpeed: 200,
	spawnRange: [75, 200],
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
		this.load.image('ground', groundSprite);
		this.load.image('bg', bgSprite);
		this.load.image('p1', p1Sprite);
		this.load.image('p2', p2Sprite);
		this.load.image('p3', p3Sprite);
		this.load.spritesheet('coin', coinSprite, { frameWidth: 144, frameHeight: 144 });
		// this.load.spritesheet('campy', campySprite, { frameWidth: 175, frameHeight: 240 });
		this.load.spritesheet('campy', campySprite, { frameWidth: 84, frameHeight: 105 });
	}

	create() {
		// alias the config
		this.config = this.sys.game.config;

		// this.bg = this.add.image(this.config.width * 0.5, this.config.height * 0.5, 'bg');
		this.physics.add.sprite(0, this.config.height * .5, 'bg');
		// this.bg.setDisplaySize(320, 640);
		// this.bg.setScale(.9);
		// this.bg.setRotation(3.14159);

		this.bgGroup = this.add.group();

		this.score = 0;
		this.scoreText = this.add.text(16, 16, '0', { fontSize: '32px', fill: '#FFF', fontFamily: 'Poppins' });

		// create platform group
		this.platformGroup = this.add.group({
			removeCallback: function (platform) {
				platform.scene.platformPool.add(platform)
			}
		});

		// create platform pool
		this.platformPool = this.add.group({
			removeCallback: function (platform) {
				platform.scene.platformGroup.add(platform)
			}
		})

		// create coins group
		this.coinGroup = this.add.group({
			removeCallback: function (coin) {
				coin.scene.coinPool.add(coin)
			}
		});

		// create coins pool
		this.coinPool = this.add.group({
			removeCallback: function (coin) {
				coin.scene.coinGroup.add(coin)
			}
		});

		// add a platform
		this.addPlatform(3, this.config.width / 2, gameOptions.platformStartHeight);

		// add a player
		this.playerJumps = 0;
		this.player = this.physics.add.sprite(this.config.width * .5, gameOptions.playerStartHeight, 'campy');

		this.player.setGravityY(gameOptions.playerGravity);
		this.player.setDisplaySize(42, 58); // 504 w
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
		let platform;

		/**
		 * commenting out the object pooling for now
		 */

		// if (this.platformPool.getLength()) {
		// 	platform = this.platformPool.getFirst();
		// 	platform.x = posX;

		// 	platform.active = true;
		// 	platform.visible = true;
		// 	this.platformPool.remove(platform);
		// }
		// else {
		platform = this.physics.add.sprite(posX, posY, sprite);
		platform.setImmovable(true);

		if (this.gameHasStarted) {
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
		}
		this.platformGroup.add(platform);
		// }
		platform.setScale(.5);
		// platform.displayWidth = 350;
		this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
		this.lastPlatformHeight = posY;

		// don't add a coin on the first platform
		if (this.platformGroup.getLength() > 1 && (Phaser.Math.Between(0, 1) * gameOptions.coinChance > 0)) {
			this.addCoin(posX, posY - 40);
		}
	}

	addCoin(posX, posY) {
		let coin;
		// if (this.coinPool.getLength()) {
		// 	console.log('ya');
		// 	coin = this.coinPool.getFirst();
		// 	coin.x = posX;
		// 	coin.y = posY;
		// 	coin.active = true;
		// 	coin.visible = true;
		// 	this.coinPool.remove(coin);
		// }
		// else {
		coin = this.physics.add.sprite(posX, posY, 'coin');
		coin.setDisplaySize(20, 20, true);
		coin.anims.play('coin');
		// coin.setImmovable(true);
		coin.setVelocityX(gameOptions.platformStartSpeed * -1);
		this.coinGroup.add(coin);
		// }
	}

	collectCoin(player, coin) {
		coin.disableBody(true, true);
		this.score += 10;
		this.scoreText.setText(this.score);
	}

	startGame() {
		this.gameHasStarted = true;
		this.platformGroup.getChildren().forEach(function(platform) {
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
		});

		this.player.anims.play('walk', true);
	}

	// the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
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
			this.playerJumps++;
		}
	}
}
