var config = {
    'width': 1280,
    'height': 908,
    'renderer': Phaser.AUTO,
    'parent': 'bumper-cars',
    'resolution': window.devicePixelRatio,
    'state': { preload: preload, create: create, update: update, render: render }
}

var game = new Phaser.Game(config);

WebFontConfig = {
    //  The Google Fonts we want to load (specify as many as you like in the array)
    google: {
      families: ['Bungee']
    }
};

function preload() {
    game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
    game.load.image('puck', 'img/puck.png');
    game.load.spritesheet('car1', 'img/car-wes-blue.png', 100, 130);
    game.load.spritesheet('car2', 'img/car-brad-blue.png', 100, 130);
    game.load.spritesheet('car3', 'img/car-dan-red.png', 100, 130);
    game.load.spritesheet('car4', 'img/car-jared-red.png', 100, 130);
    game.load.spritesheet('indicator', 'img/controller-indicator.png', 90, 48);
    game.load.image('pole', 'img/pole2x.png');
    game.load.image('stage', 'img/stage2x.jpg');
    game.load.image('map2', 'img/transparent.png');
    game.load.image('black', 'img/black.png');
    game.load.image('title', 'img/title.jpg');
    game.load.physics('mapData', 'mapBounds.json');
    game.load.audio('background-track', 'audio/background-track.mp3');
    game.load.audio('cheer', 'audio/cheer.mp3');
    game.load.audio('hit', 'audio/hit.mp3');
}

var map, car1, car2, car3, car4, puck, pole, pole2, pole3, pole4, stage, gameOverBackground, titleImage;
var redText, blueText;
var pad1, pad2, pad3, pad4, cursors, pauseKey;
var wKey, aKey, sKey, dKey, enterKey;
var carsCanDrive = false;
var onTitleScreen = true;

var angle, xValue, yValue;
var indicator1, indicator2, indicator3, indicator4;
var goalScoreSound, hitSound;

var timer, clockMinutes, clockSeconds;
var gameClock = 180; // Length of match in seconds
var redGoalCount = 0;
var blueGoalCount = 0;
var redGoalCountText, blueGoalCountText, startText, gameOverText;
var clockStyle = { font: '36px Bungee, sans-serif', fill: '#fff', align: 'center' };

var activePuck = true;
var initialThrust = 3000;
var initialSpeed = 20;
var accelerateSpeed = 7000;
var speed = initialSpeed;
var p1isBoosting = false;

var carWidth = 50;
var carHeight = 65;
var carDamping = 0.99;
var carMass = 6;
var puckMass = 1;
var poleGroup;
var puckSize = 25;

function create() {
    //  world size
    game.world.setBounds(0, 0, 1280, 908);

    stage = game.add.sprite(0, 0, 'stage');
    stage.width = 1280;
    stage.height = 908;

    //  Enable P2
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.restitution = 0.5;
    game.physics.p2.setImpactEvents(true);

    map = game.add.sprite(10, 10, 'map2');
    game.physics.p2.enable(map, false);
    map.body.clearShapes();
    map.body.loadPolygon('mapData', 'map2');
    map.body.kinematic = true; // fix the object

    // clock
    // http://phaser.io/docs/2.6.2/Phaser.Timer.html
    timer = game.time.create(false);
    timer.loop(Phaser.Timer.SECOND, updateClock, this);
    //game.time.advancedTiming = true; // needed for FPS in debug
    gameClockText = game.add.text(1060, 66, '-:--', clockStyle);
    gameClockText.anchor.setTo(0.5, 0.5);

    // create pole physics group
    poleGroup = game.add.group();
    poleGroup.enableBody = true;
    poleGroup.physicsBodyType = Phaser.Physics.P2JS;

    createPole(480, 294);
    createPole(800, 294);
    createPole(480, 612);
    createPole(800, 612);

    // bumper car (player1)
    car1 = game.add.sprite(1110, 410, 'car1');
    car1.width = carWidth;
    car1.height = carHeight;
    car1.enableBody = true;
    car1.anchor.setTo(0.5, 0.5);
    game.physics.p2.enable(car1, false);
    car1.body.damping = carDamping;
    car1.body.mass = carMass;
    car1.body.angle = 270;

    // bumper car (player2)
    car2 = game.add.sprite(1110, 498, 'car2');
    car2.width = carWidth;
    car2.height = carHeight;
    car2.enableBody = true;
    car2.anchor.setTo(0.5, 0.5);
    game.physics.p2.enable(car2, false);
    car2.body.damping = carDamping;
    car2.body.mass = carMass;
    car2.body.angle = 270;

    // bumper car (player3)
    car3 = game.add.sprite(170, 410, 'car3');
    car3.width = carWidth;
    car3.height = carHeight;
    car3.enableBody = true;
    car3.anchor.setTo(0.5, 0.5);
    game.physics.p2.enable(car3, false);
    car3.body.damping = carDamping;
    car3.body.mass = carMass;
    car3.body.angle = 90;

    // bumper car (player4)
    car4 = game.add.sprite(170, 498, 'car4');
    car4.width = carWidth;
    car4.height = carHeight;
    car4.enableBody = true;
    car4.anchor.setTo(0.5, 0.5);
    game.physics.p2.enable(car4, false);
    car4.body.damping = carDamping;
    car4.body.mass = carMass;
    car4.body.angle = 90;

    // puck
    puck = game.add.sprite(game.world.centerX, game.world.centerY, 'puck');
    puck.enableBody = true;
    game.physics.p2.enable(puck, false);
    puck.body.setCircle(puckSize);
    puck.height = puckSize * 2;
    puck.width = puckSize * 2;
    puck.body.mass = puckMass;
    // TODO: refactor into one car collision group: https://phaser.io/examples/v2/p2-physics/collision-groups
    puck.body.createBodyCallback(car1, hitPuck, this); // detect collision with cars
    puck.body.createBodyCallback(car2, hitPuck, this); // detect collision with cars
    puck.body.createBodyCallback(car3, hitPuck, this); // detect collision with cars
    puck.body.createBodyCallback(car4, hitPuck, this); // detect collision with cars

    // create sound effects
    goalScoreSound = game.add.audio('cheer');
    goalScoreSound.volume = 0.7;
    hitSound = game.add.audio('hit');
    hitSound.volume = 0.5;

    // Gamepad
    game.input.gamepad.start();
    pad1 = game.input.gamepad.pad1; pad1.deadZone = 0;
    pad2 = game.input.gamepad.pad2; pad2.deadZone = 0;
    pad3 = game.input.gamepad.pad3; pad3.deadZone = 0;
    pad4 = game.input.gamepad.pad4; pad4.deadZone = 0;

    // Enable keyboard cursors for testing
    cursors = game.input.keyboard.createCursorKeys();

    //  Register the keys
    this.wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
    this.aKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
    this.sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
    this.dKey = game.input.keyboard.addKey(Phaser.Keyboard.D);
    this.enterKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);

    //  Stop the following keys from propagating up to the browser
    game.input.keyboard.addKeyCapture([ Phaser.Keyboard.W, Phaser.Keyboard.A, Phaser.Keyboard.S, Phaser.Keyboard.D, Phaser.Keyboard.ENTER ]);

    // are controllers synced?
    indicator1 = game.add.sprite(1228, 92, 'indicator');
    indicator1.width = 45;
    indicator1.height = 24;
    indicator2 = game.add.sprite(1228, 866, 'indicator');
    indicator2.width = 45;
    indicator2.height = 24;
    indicator3 = game.add.sprite(86, 92, 'indicator');
    indicator3.width = 45;
    indicator3.height = 24;
    indicator4 = game.add.sprite(86, 866, 'indicator');
    indicator4.width = 45;
    indicator4.height = 24;

    // TODO: make into separate scene instead
    showTitleScreen();
}

function createPole (x, y) {
    var pole = poleGroup.create(x, y, 'pole');
    pole.width = 106;
    pole.height = 106;
    pole.body.setCircle(33);
    pole.body.kinematic = true; // fix the object
}

function accelerate (car, xStick, yStick, speed) {
    //https://phaser.io/docs/2.3.0/Phaser.Physics.P2.Body.html#rotateLeft
    car.frame = 1;
    var angle = Math.atan2(yStick, xStick);
    car.body.rotation = angle + game.math.degToRad(90);  // correct the angle
    car.body.force.x = Math.cos(angle) * speed; // apply acceleration 
    car.body.force.y = Math.sin(angle) * speed;
    // stop drift angle https://gist.github.com/ShimShamSam/f10d60ad39040ed6add0
}

function scoreGoal (scoringTeam) {
    goalScoreSound.play();
    activePuck = false;
    timer.pause();
    game.time.events.add(Phaser.Timer.SECOND * 2, resetPuck, this);
    carsCanDrive = false;

    if (scoringTeam === 'red') {
        blueGoalCount += 1;
        blueGoalCountText.text = blueGoalCount;
        redText.alpha = 1;
    } else if (scoringTeam === 'blue') {
        redGoalCount += 1;
        redGoalCountText.text = redGoalCount;
        blueText.alpha = 1;
    }
}

function resetPuck() {
    redText.alpha = 0;
    blueText.alpha = 0;
    puck.reset(game.world.centerX, game.world.centerY);
    activePuck = true;
    timer.resume();

    car1.reset(1110, 410);
    car1.body.angle = 270;

    car2.reset(1110, 498);
    car2.body.angle = 270;

    car3.reset(170, 410);
    car3.body.angle = 90;

    car4.reset(170, 498);
    car4.body.angle = 90;

    // wait 1 second, then let cars move again
    game.time.events.add(Phaser.Timer.SECOND, enableCars, this);
}

function updateClock() {
    clockMinutes = Math.floor(gameClock / 60); // Convert seconds into minutes and seconds
    clockSeconds = Math.floor(gameClock) - (60 * clockMinutes);
    var result = clockMinutes; // Display minutes
    result += (clockSeconds < 10) ? ':0' + clockSeconds : ':' + clockSeconds; // Display seconds, add a 0 to the start if less than 10
    gameClockText.text = result;
    gameClock -= 1;

    if (gameClock === -1) {
        timer.stop();
        gameOver();
    }
}

function createScoreText() {
    redGoalCountText = game.add.text(186, 68, redGoalCount, clockStyle);
    redGoalCountText.anchor.setTo(0.5, 0.5);
    blueGoalCountText = game.add.text(258, 68, blueGoalCount, clockStyle);
    blueGoalCountText.anchor.setTo(0.5, 0.5);
}

function createGoalText() {
    var style = { font: '32px Bungee, sans-serif', fill: '#fff' };
    redText = game.add.text(66, 450, "GOAL!!!", style);
    redText.alpha = 0;
    redText.anchor.setTo(0.5, 0.5);
    redText.angle = 270;

    blueText = game.add.text(1215, 450, "GOAL!!!", style);
    blueText.alpha = 0;
    blueText.anchor.setTo(0.5, 0.5);
    blueText.angle = 90;
}

function hitPuck(body1, body2) {
    hitSound.play();
}

function enableCars() {
    carsCanDrive = true;
}

function showTitleScreen() {
    titleImage = game.add.sprite(0, 0, 'title');
    titleImage.width = game.world.width;
    titleImage.height = game.world.height;
    startText = game.add.text(game.world.centerX, 780, "Press Enter to start", { font: '38px Bungee, sans-serif', fill: '#0c88dd' });
    startText.anchor.setTo(0.5, 0.5);
    game.add.tween(startText).to({ alpha: 0 }, 700, Phaser.Easing.Quadratic.Out, true, 0, -1, true);
}

function startGame() {
    titleImage.kill();
    timer.start();
    startText.kill();
    game.sound.context.resume(); // prevents AudioContext warning
    game.time.events.add(Phaser.Timer.SECOND, createScoreText, this); // 1 second delay to fix webfont loading issue
    game.time.events.add(Phaser.Timer.SECOND, createGoalText, this);
    game.time.events.add(Phaser.Timer.SECOND, enableCars, this);
    // add music
    music = game.add.audio('background-track');
    music.volume = 0.4;
    music.loop = true;
    music.play();
}

function gameOver() {
    // TODO: this should change to a Game Over scene instead
    gameOverBackground = game.add.sprite(0, 0, 'black');
    gameOverBackground.width = game.world.width * 2;
    gameOverBackground.height = game.world.height * 2;
    gameOverText = game.add.text(game.world.centerX, game.world.centerY - 70, 'Game Over', { font: '80px Bungee, sans-serif', fill: '#fff' });
    gameOverText.anchor.setTo(0.5, 0.5);
    replayText = game.add.text(game.world.centerX, game.world.centerY + 40, 'Refresh to play again', { font: '40px Bungee, sans-serif', fill: '#fff' });
    replayText.anchor.setTo(0.5, 0.5);
    console.log('Game over!');
}

function update() {
    if (game.input.gamepad.supported && game.input.gamepad.active) {
        if (game.input.gamepad.pad1.connected) {
            indicator1.animations.frame = 0;
        } else {
            indicator1.animations.frame = 2;
        }
        if (game.input.gamepad.pad2.connected) {
            indicator2.animations.frame = 0;
        } else {
            indicator2.animations.frame = 2;
        }
        if (game.input.gamepad.pad3.connected) {
            indicator3.animations.frame = 0;
        } else {
            indicator3.animations.frame = 2;
        }
        if (game.input.gamepad.pad4.connected) {
            indicator4.animations.frame = 0;
        } else {
            indicator4.animations.frame = 2;
        }
    }
    
    // puck and scoring
    if (activePuck === true) {
        if (puck.body.x < 110) {
            scoreGoal('red');
        }
        if (puck.body.x > 1170) {
            scoreGoal('blue');
        }
    }

    // stop car from spinning when it collides with things
    car1.body.setZeroRotation();
    car2.body.setZeroRotation();
    car3.body.setZeroRotation();
    car4.body.setZeroRotation();

    // TEST
    if (onTitleScreen === true && this.enterKey.isDown) {
        onTitleScreen = false;
        startGame();
    }

    // gamepad controls
    pad1Xstick = pad1.axis(Phaser.Gamepad.AXIS_0);
    pad1Ystick = pad1.axis(Phaser.Gamepad.AXIS_1);
    pad2Xstick = pad2.axis(Phaser.Gamepad.AXIS_0);
    pad2Ystick = pad2.axis(Phaser.Gamepad.AXIS_1);
    pad3Xstick = pad3.axis(Phaser.Gamepad.AXIS_0);
    pad3Ystick = pad3.axis(Phaser.Gamepad.AXIS_1);
    pad4Xstick = pad4.axis(Phaser.Gamepad.AXIS_0);
    pad4Ystick = pad4.axis(Phaser.Gamepad.AXIS_1);    

    if (carsCanDrive) {
        // player 1 (arrow keys)
        if (cursors.left.isDown) { // left
            car1.body.angle = -90;
            car1.body.velocity.x -= 20;
        } else if (cursors.right.isDown) { // right
            car1.body.angle = 90;
            car1.body.velocity.x += 20;
        } if (cursors.up.isDown) { // up
            car1.body.angle = 0;
            car1.body.velocity.y -= 20;
        } else if (cursors.down.isDown) { // down
            car1.body.angle = 180;
            car1.body.velocity.y += 20;
        }

        if (cursors.left.isDown && cursors.up.isDown) { // left + up
            car1.body.angle = -45;
        } else if (cursors.up.isDown && cursors.right.isDown) { // up + right
            car1.body.angle = 45;
        } else if (cursors.right.isDown && cursors.down.isDown) { // right + down
            car1.body.angle = 135;
        } else if (cursors.down.isDown && cursors.left.isDown) { // down + left
            car1.body.angle = -135;
        }

        // player 4 (w a s d keys)
        if (this.aKey.isDown) { // left
            car4.body.angle = -90;
            car4.body.velocity.x -= 20;
        } else if (this.dKey.isDown) { // right
            car4.body.angle = 90;
            car4.body.velocity.x += 20;
        } if (this.wKey.isDown) { // up
            car4.body.angle = 0;
            car4.body.velocity.y -= 20;
        } else if (this.sKey.isDown) { // down
            car4.body.angle = 180;
            car4.body.velocity.y += 20;
        }

        if (this.aKey.isDown && this.wKey.isDown) { // left + up
            car4.body.angle = -45;
        } else if (this.wKey.isDown && this.dKey.isDown) { // up + right
            car4.body.angle = 45;
        } else if (this.dKey.isDown && this.sKey.isDown) { // right + down
            car4.body.angle = 135;
        } else if (this.sKey.isDown && this.aKey.isDown) { // down + left
            car4.body.angle = -135;
        }

        // car 1 gamepad
        if (pad1.axis(Phaser.Gamepad.AXIS_0) < -0.2 || pad1.axis(Phaser.Gamepad.AXIS_0) > 0.2) {
            accelerate(car1, pad1Xstick, pad1Ystick, accelerateSpeed);
        } else if (pad1.axis(Phaser.Gamepad.AXIS_1) < -0.2 || pad1.axis(Phaser.Gamepad.AXIS_1) > 0.2) {
            accelerate(car1, pad1Xstick, pad1Ystick, accelerateSpeed);
        } else {
            car1.frame = 0;
        }
        // speed boost
        if (pad1.justPressed(Phaser.Gamepad.BUTTON_0)) {
            car1.body.thrust(initialThrust * 1.2);
        }

        // car 2 gamepad
        if (pad2.axis(Phaser.Gamepad.AXIS_0) < -0.2 || pad2.axis(Phaser.Gamepad.AXIS_0) > 0.2) {
            accelerate(car2, pad2Xstick, pad2Ystick, accelerateSpeed);
        } else if (pad2.axis(Phaser.Gamepad.AXIS_1) < -0.2 || pad2.axis(Phaser.Gamepad.AXIS_1) > 0.2) {
            accelerate(car2, pad2Xstick, pad2Ystick, accelerateSpeed);
        } else {
            car2.frame = 0;
        }
        // speed boost
        if (pad2.justPressed(Phaser.Gamepad.BUTTON_0)) {
            car2.body.thrust(initialThrust * 1.2);
        }

        // car 3 gamepad
        if (pad3.axis(Phaser.Gamepad.AXIS_0) < -0.2 || pad3.axis(Phaser.Gamepad.AXIS_0) > 0.2) {
            accelerate(car3, pad3Xstick, pad3Ystick, accelerateSpeed);
        } else if (pad3.axis(Phaser.Gamepad.AXIS_1) < -0.2 || pad3.axis(Phaser.Gamepad.AXIS_1) > 0.2) {
            accelerate(car3, pad3Xstick, pad3Ystick, accelerateSpeed);
        } else {
            car3.frame = 0;
        }
        // speed boost
        if (pad3.justPressed(Phaser.Gamepad.BUTTON_0)) {
            car3.body.thrust(initialThrust * 1.2);
        }

        // car 4 gamepad
        if (pad4.axis(Phaser.Gamepad.AXIS_0) < -0.2 || pad4.axis(Phaser.Gamepad.AXIS_0) > 0.2) {
            accelerate(car4, pad4Xstick, pad4Ystick, accelerateSpeed);
        } else if (pad4.axis(Phaser.Gamepad.AXIS_1) < -0.2 || pad4.axis(Phaser.Gamepad.AXIS_1) > 0.2) {
            accelerate(car4, pad4Xstick, pad4Ystick, accelerateSpeed);
        } else {
            car4.frame = 0;
        }
        // speed boost
        if (pad4.justPressed(Phaser.Gamepad.BUTTON_0)) {
            car4.body.thrust(initialThrust * 1.2);
        }
    }
    
    /*
    justPressed
    justReleased
    isDown

    0 = X
    1 = circle
    2 = square
    3 = triangle
    */

} // end update();

function render() {
    //game.debug.text(game.time.fps, 5, 14, '#00ff00');
}