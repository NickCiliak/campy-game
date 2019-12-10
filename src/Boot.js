import Phaser from 'phaser';

import Game from './scenes/Game';

const config = {
	type: Phaser.AUTO,
	width: 320,
	// backgroundColor: 0x356ae6,
	height: 640,
	scene: [Game],
	physics: {
		default: 'arcade'
	},
	scale: {
		mode: Phaser.Scale.FIT,
		parent: 'body',
		autoCenter: Phaser.Scale.CENTER_BOTH,
		// width: 320,
		// height: 640
	},
};

new Phaser.Game(config);

// This is for preventing re-run multiple scenes
if (module.hot) {
	module.hot.dispose(() => {
		window.location.reload();
	});
}
