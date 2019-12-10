import Phaser from 'phaser';

import Game from './scenes/Game';

const config = {
	type: Phaser.AUTO,
	width: 640,
	backgroundColor: 0x1F2129,
	height: 1280,
	scene: [Game],
	physics: {
		default: 'arcade'
	},
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: 640,
		height: 1280
	},
};

new Phaser.Game(config);

// This is for preventing re-run multiple scenes
if (module.hot) {
	module.hot.dispose(() => {
		window.location.reload();
	});
}
