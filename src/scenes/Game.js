import Phaser from 'phaser';

import groundSprite from '../../assets/ground.png';
import campySprite from '../../assets/campy2.png';
import coinSprite from '../../assets/coin.png';

let gameOptions = {
	playerStartPosition: 100,
	playerStartHeight: 300,
	platformStartHeight: 360,
	playerGravity: 900,
	platformStartSpeed: 200,
	spawnRange: [50, 100],
	platformSizeRange: [100, 250],
	platformHeightRange: [-50, 50],
	jumpForce: 400,
	jumps: 2,
	platformHeightScale: 2,
	platformVerticalLimit: [.1, .9]
}

export default class Game extends Phaser.Scene {
	constructor() {
		super({ key: 'CampyGame' });
	}

	preload() {
		this.load.image('ground', groundSprite);
		this.load.image('coin', coinSprite);
		this.load.image('campy', campySprite);
	}

	create() {
		// alias the config
		this.config = this.sys.game.config;

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
		this.coinGroup = this.physics.add.group({
			removeCallback: function (coin) {
				coin.scene.coinPool.add(coin)
			}
		});

		// create coins pool
		this.coinPool = this.physics.add.group({
			removeCallback: function (coin) {
				coin.scene.coinGroup.add(coin)
			}
		});

		// add a platform
		this.addPlatform(this.config.width, this.config.width / 2, gameOptions.platformStartHeight);

		// add a player
		this.playerJumps = 0;
		this.player = this.physics.add.sprite(gameOptions.playerStartPosition, gameOptions.playerStartHeight, 'campy');
		this.player.setGravityY(gameOptions.playerGravity);

		// add controls
		this.input.on('pointerdown', this.jump, this);
		this.input.keyboard.on('keydown-SPACE', this.jump, this);

		// set collision between Campy and platforms
		this.physics.add.collider(this.player, this.platformGroup);
		// this.physics.add.collider(this.coinGroup, this.platformGroup);

	}

	update() {
		// game over
		if (this.player.y > this.config.height) {
			this.scene.start("CampyGame");
		}

		// keep Campy in the same x position
		this.player.x = gameOptions.playerStartPosition;

		// recycling platforms
		let minDistance = this.config.width;
		let rightmostPlatformHeight = this.lastPlatformHeight;
		this.platformGroup.getChildren().forEach(function (platform) {
			let platformDistance = this.config.width - platform.x - platform.displayWidth / 2;
			minDistance = Math.min(minDistance, platformDistance);
			if(platformDistance < minDistance){
				minDistance = platformDistance;
				// rightmostPlatformHeight = platform.y;
			}
			if (platform.x < - platform.displayWidth / 2) {
				this.platformGroup.killAndHide(platform);
				this.platformGroup.remove(platform);
			}
		}, this);

		// adding new platforms
		if (minDistance > this.nextPlatformDistance) {
			let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
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
		let platform;
		if (this.platformPool.getLength()) {
			platform = this.platformPool.getFirst();
			platform.x = posX;
			platform.active = true;
			platform.visible = true;
			this.platformPool.remove(platform);
		}
		else {
			platform = this.physics.add.sprite(posX, posY, 'ground');
			platform.setImmovable(true);
			platform.setVelocityX(gameOptions.platformStartSpeed * -1);
			this.platformGroup.add(platform);
		}
		platform.displayWidth = platformWidth;
		this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
		this.lastPlatformHeight = posY;

		this.addCoin(posX, posY - 200);
	}

	addCoin(posX, posY) {
		console.log(posX, posY);
		let coin;
		if (this.coinPool.getLength()) {
			console.log('ya');
			coin = this.coinPool.getFirst();
			coin.x = posX;
			coin.y = posY;
			coin.active = true;
			coin.visible = true;
			this.coinPool.remove(coin);
		}
		else {
			coin = this.physics.add.sprite(posX, posY, 'coin');
			coin.setImmovable(true);
			coin.setVelocityX(gameOptions.platformStartSpeed * -1);
			this.coinGroup.add(coin);
		}
	}

	// the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
	jump() {
		if (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)) {
			if (this.player.body.touching.down) {
				this.playerJumps = 0;
			}
			this.player.setVelocityY(gameOptions.jumpForce * -1);
			this.playerJumps++;
		}
	}
}
