import init, {Universe, Cell} from './pkg/wasm_game_of_life.js';

const {memory} = await init();

const universe = Universe.new();

const CELL_BORDER = 0;
const GRID_COLOR = "#ccc";
const DEAD_COLOR = "#000";
const ALIVE_COLOR = "#fff";

let uWidth = universe.width();
let uHeight = universe.height();

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('game-of-life-canvas');

const cellSize = 5;

const setUniverseDimensions = () => {
  const {width: w, height: h} = canvas.getBoundingClientRect();

  const width = Math.floor(Math.max(w, window.innerWidth));
  const height = Math.floor(h);

  const blockSize = 8;

  const blocksWide = Math.floor(width / cellSize / blockSize);
  const blocksHigh = Math.floor(height / cellSize / blockSize);

  uWidth = blockSize * blocksWide;
  uHeight = blockSize * blocksHigh;

  universe.resize_and_seed(uWidth, uHeight);

  canvas.width = uWidth * cellSize;
  canvas.height = uHeight * cellSize;
};

window.addEventListener('resize', setUniverseDimensions);
setUniverseDimensions();

const ctx = canvas.getContext('2d');

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  for (let i = 0; i <= uWidth; i++) {
    ctx.moveTo(i * (cellSize + CELL_BORDER) + CELL_BORDER, 0);
    ctx.lineTo(i * (cellSize + CELL_BORDER) + CELL_BORDER, (cellSize + CELL_BORDER) * uHeight + CELL_BORDER);
  }

  for (let j = 0; j <= uHeight; j++) {
    ctx.moveTo(0, j * (cellSize + CELL_BORDER) + CELL_BORDER);
    ctx.lineTo((cellSize + CELL_BORDER) * uWidth + CELL_BORDER, j * (cellSize + CELL_BORDER) + CELL_BORDER);
  }

  ctx.stroke();
};

/**
 * @param {number} row
 * @param {number} column
 */
const getIndex = (row, column) => {
  return row * uWidth + column;
};

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, uWidth * uHeight);

  ctx.beginPath();

  for (let row = 0; row < uHeight; row++) {
    for (let col = 0; col < uWidth; col++) {
      const idx = getIndex(row, col);

      ctx.fillStyle = cells[idx] === Cell.Dead
        ? DEAD_COLOR
        : ALIVE_COLOR;

      ctx.fillRect(
        col * (cellSize + CELL_BORDER) + CELL_BORDER,
        row * (cellSize + CELL_BORDER) + CELL_BORDER,
        cellSize,
        cellSize
      );
    }
  }

  ctx.stroke();
};

let animationId = null;

const TICK_RATE = 1000 / 30;
let lastTick = performance.now();

const renderLoop = ts => {
  let diff = ts - lastTick;

  if (diff >= TICK_RATE) {
    lastTick = ts;
    universe.tick();
    // drawGrid();
    drawCells();
  }

  animationId = requestAnimationFrame(renderLoop);
};

const isPaused = () => animationId === null;

const playPauseButton = document.getElementById("play-pause");

const play = () => {
  playPauseButton.textContent = 'pause';
  animationId = requestAnimationFrame(renderLoop);
};

const pause = () => {
  playPauseButton.textContent = 'play';
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener('click', () => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

play();

const paintCell = (row, col) => {
  universe.set_cell(row, col, Cell.Alive);
  //drawGrid();
  drawCells();
};

const paintGlider = (row, col) => {
  universe.set_cell(row, col, Cell.Alive);
  universe.set_cell(row + 1, col + 1, Cell.Alive);
  universe.set_cell(row + 2, col - 1, Cell.Alive);
  universe.set_cell(row + 2, col, Cell.Alive);
  universe.set_cell(row + 2, col + 1, Cell.Alive);
  drawCells();
};

/**
 * @param e {MouseEvent | Touch}
 */
const clientCoordToRowCol = e => screenCoordToCanvasCoord(e.clientX, e.clientY);

function screenCoordToCanvasCoord(x, y) {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (x - boundingRect.left) * scaleX;
  const canvasTop = (y - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (cellSize + CELL_BORDER)), uHeight - CELL_BORDER);
  const col = Math.min(Math.floor(canvasLeft / (cellSize + CELL_BORDER)), uWidth - CELL_BORDER);

  return {row, col};
}

/**
 * @param touch {Touch}
 */
function paintCircle(touch) {
  const {row: y, col: x} = clientCoordToRowCol(touch);
  const {row: rY, col: rX} = screenCoordToCanvasCoord(touch.radiusX, touch.radiusY);
  const radius = Math.max(rX, rY);
  universe.draw_circle(x, y, radius);
}

/**
 * @param e {MouseEvent}
 */
const mouseToToggle = e => {
  const {row, col} = clientCoordToRowCol(e);

  if (e.ctrlKey && col < uWidth - 1 && row < uWidth - 1) {
    paintGlider(row, col);
  } else {
    paintCell(row, col);
  }
};

/**
 * @param e {TouchEvent}
 */
const touchToToggle = e => {
  // stops Android pull-to-refresh behaviour that inhibits the
  // user from painting their cells.
  e.preventDefault();

  for (const touch of e.changedTouches) {
    paintCircle(touch);
  }

  drawCells();
};

canvas.addEventListener('mousemove', e => {
  // only do anything when the user is holding down click.
  if (e.buttons === 1) {
    mouseToToggle(e);
  }
});
canvas.addEventListener('mousedown', mouseToToggle);
canvas.addEventListener('touchstart', touchToToggle);
canvas.addEventListener('touchmove', touchToToggle);

const clearButton = document.getElementById('clear');

clearButton.addEventListener('click', e => {
  e.preventDefault();
  universe.set_height(uHeight);
  universe.set_width(uWidth);
  drawCells();
});

const resetButton = document.getElementById('reset');

resetButton.addEventListener('click', e => {
  e.preventDefault();
  universe.resize_and_seed(uWidth, uHeight);
  drawCells();
});
