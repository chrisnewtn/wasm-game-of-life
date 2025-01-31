import GameOfLife from './game-of-life.js';

/** @type {GameOfLife} */
const gameOfLife = document.querySelector('game-of-life');

if (gameOfLife) {
  setSize(gameOfLife);
  bindEvents(gameOfLife);
  window.addEventListener('resize', () => setSize(gameOfLife));
}

/**
 * @param {GameOfLife} gameOfLife
 */
function setSize(gameOfLife) {
  const {height: h} = gameOfLife.getBoundingClientRect();

  const width = Math.floor(window.innerWidth);
  const height = Math.floor(h);

  const blockSize = 8;

  const blocksWide = Math.floor(width / gameOfLife.cellSize / blockSize);
  const blocksHigh = Math.floor(height / gameOfLife.cellSize / blockSize);

  gameOfLife.setAttribute('width', blockSize * blocksWide);
  gameOfLife.setAttribute('height', blockSize * blocksHigh);
}

/**
 * @param {GameOfLife} gameOfLife
 */
function bindEvents(gameOfLife) {
  const playPauseButton = document.getElementById('play-pause');

  playPauseButton.addEventListener('click', () => {
    if (gameOfLife.isPaused) {
      playPauseButton.textContent = 'pause';
      gameOfLife.play();
    } else {
      playPauseButton.textContent = 'play';
      gameOfLife.pause();
    }
  });

  const clearButton = document.getElementById('clear');

  clearButton.addEventListener('click', e => {
    e.preventDefault();
    gameOfLife.clear();
  });

  const resetButton = document.getElementById('reset');

  resetButton.addEventListener('click', e => {
    e.preventDefault();
    gameOfLife.reset();
  });
}


