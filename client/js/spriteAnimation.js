/*

https://gist.github.com/kittykatattack/13a53d0dbc32ce2a0a17


An advanced frame and state manager for Pixi MovieClip sprites.
Use it like this:

Add the advanced state player to a PIXI.MovieClip

    addStatePlayer(movieClipSprite);

Set the frame rate

    movieClipSprite.fps = 12;

Play any sequence of frames
(provide a start frame and end frame as a two element array)

    movieClipSprite.playSequence([startFrameNumber, endFrameNumber]);

Show a specific frame (this is a convenience wrapper for `gotoAndStop`)

    movieClipSprite.show(anyFrameNumber);
    
*/

function addStatePlayer(sprite) {
  //Make sure the sprite is a Pixi MovieClip
  if (!(sprite instanceof PIXI.MovieClip)) {
    throw new Error("You can only animate PIXI.MovieClip sprites");
    return;
  }
  
  //Intialize the variables
  var frameCounter = 0,
      numberOfFrames = 0,
      startFrame = 0,
      endFrame = 0,
      timerInterval = undefined,
      playing = false;
  
  //The `show` function (to display static states)
  function show(frameNumber) {
    //Reset any possible previous animations
    reset();
    //Find the new state on the sprite 
    sprite.gotoAndStop(frameNumber);
  };

  //The `playSequence` function, to play a sequence of frames
  function playSequence(sequenceArray) {
    //Reset any possible previous animations
    reset();
    //Figure out how many frames there are in the range
    startFrame = sequenceArray[0];
    endFrame = sequenceArray[1];
    numberOfFrames = endFrame - startFrame+1;
    //Calculate the frame rate. Set a default fps of 12
    if (!sprite.fps) sprite.fps = 12;
    var frameRate = 1000 / sprite.fps;
    //Set the sprite to the starting frame
    sprite.gotoAndStop(startFrame);
    //If the state isn't already playing, start it
    if(!playing) {
      timerInterval = setInterval(advanceFrame.bind(this), frameRate);
      playing = true;
    }
  };
  
  //`advanceFrame` is called by `setInterval` to dislay the next frame
  //in the sequence based on the `frameRate`. When frame sequence
  //reaches the end, it will either stop it or loop it.
  function advanceFrame() {
    //Advance the frame if `frameCounter` is less than 
    //the state's total frames
    if (frameCounter < numberOfFrames) {
      //Advance the frame
      sprite.gotoAndStop(sprite.currentFrame + 1);
      //Update the frame counter
      frameCounter += 1;
    } else {
      //If we've reached the last frame and `loop`
      //is `true`, then start from the first frame again
      if (sprite.loop) {
        sprite.gotoAndStop(startFrame);
        frameCounter = 1;
      }
    }
  }
  
  function reset() {
    //Reset `playing` to `false`, set the `frameCounter` to 0,
    //and clear the `timerInterval`
    if (timerInterval !== undefined && playing === true) {
      playing = false;
      frameCounter = 0;
      startFrame = 0;
      endFrame = 0;
      numberOfFrames = 0;
      clearInterval(timerInterval);
    }
  }

  //Add the `show` and `playSequence` methods to the sprite
  sprite.show = show;
  sprite.playSequence = playSequence;
}