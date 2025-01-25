import init, {Universe, Cell} from './pkg/wasm_game_of_life.js';

const {memory} = await init();

const universe = Universe.new();

const CELL_BORDER = 0;
const GRID_COLOR = "#ccc";
const DEAD_COLOR = "#000";
const ALIVE_COLOR = "#fff";

const width = universe.width();
const height = universe.height();

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('game-of-life-canvas');

let cellSize;

const setCanvasDimensions = () => {
  cellSize = Math.floor(
    Math.min(
      document.documentElement.clientHeight,
      document.documentElement.clientWidth
    ) / 64
  );

  canvas.height = (cellSize + CELL_BORDER) * height + CELL_BORDER;
  canvas.width = (cellSize + CELL_BORDER) * width + CELL_BORDER;
};

window.addEventListener('resize', () => {
  setCanvasDimensions();
});

setCanvasDimensions();

const ctx = canvas.getContext('2d');

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (cellSize + CELL_BORDER) + CELL_BORDER, 0);
    ctx.lineTo(i * (cellSize + CELL_BORDER) + CELL_BORDER, (cellSize + CELL_BORDER) * height + CELL_BORDER);
  }

  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (cellSize + CELL_BORDER) + CELL_BORDER);
    ctx.lineTo((cellSize + CELL_BORDER) * width + CELL_BORDER, j * (cellSize + CELL_BORDER) + CELL_BORDER);
  }

  ctx.stroke();
};

/**
 * @param {number} row
 * @param {number} column
 */
const getIndex = (row, column) => {
  return row * width + column;
};

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  ctx.beginPath();

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
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
const clientCoordToRowCol = e => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (e.clientX - boundingRect.left) * scaleX;
  const canvasTop = (e.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (cellSize + CELL_BORDER)), height - CELL_BORDER);
  const col = Math.min(Math.floor(canvasLeft / (cellSize + CELL_BORDER)), width - CELL_BORDER);

  return {row, col};
}

/**
 * @param e {MouseEvent}
 */
const mouseToToggle = e => {
  const {row, col} = clientCoordToRowCol(e);

  if (e.ctrlKey && col < width - 1 && row < width - 1) {
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

  for (const touch of e.touches) {
    const {row, col} = clientCoordToRowCol(touch);
    paintCell(row, col);
  }
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
