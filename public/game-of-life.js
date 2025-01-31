import init, {Universe, Cell} from './pkg/wasm_game_of_life.js';


const {memory} = await init();


const template = document.createElement('template');
template.innerHTML = `<style>
canvas {
  cursor: crosshair;
}
</style><canvas id="canvas"></canvas>`;


const TICK_RATE_DEFAULT = 1000 / 24;
const CELL_SIZE_DEFAULT = 5;
const CELL_BORDER_DEFAULT = 0;


export default class GameOfLife extends HTMLElement {
  static observedAttributes = [
    'width',
    'height',
    'cell-size',
    'cell-border',
    'tick-rate',
  ];

  #universe = Universe.new();
  #animationId = null;

  tickRate = TICK_RATE_DEFAULT;
  cellSize = CELL_SIZE_DEFAULT;
  cellBorder = CELL_BORDER_DEFAULT;
  width = 64;
  height = 64;
  gridColor = "#ccc";
  deadColor = "#000";
  aliveColor = "#fff";
  autoplay = false;
  interactive = false;

  get isPaused() {
    return this.#animationId === null;
  }

  constructor() {
    super();
    this.autoplay = this.hasAttribute('autoplay');
    this.interactive = this.hasAttribute('interactive');
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    switch(name) {
      case 'width':
        this.width = parseInt(newValue, 10);
        this.setDimensions();
        break;
      case 'height':
        this.height = parseInt(newValue, 10);
        this.setDimensions();
        break;
      case 'cell-size':
        this.cellSize = parseInt(newValue, 10);
        if (Number.isNaN(this.cellSize)) {
          this.cellSize = CELL_SIZE_DEFAULT;
        }
        this.#setCanvasDimensions();
        break;
      case 'cell-border':
        this.cellBorder = parseInt(newValue, 10);
        if (Number.isNaN(this.cellBorder)) {
          this.cellBorder = CELL_BORDER_DEFAULT;
        }
        this.#setCanvasDimensions();
        break;
      case 'tick-rate':
        this.tickRate = 1000 / parseInt(newValue, 10);
        if (Number.isNaN(this.tickRate)) {
          this.tickRate = TICK_RATE_DEFAULT;
        }
    }
  }

  #setCanvasDimensions() {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.width = this.width * (this.cellSize + this.cellBorder);
      this.canvas.height = this.height * (this.cellSize + this.cellBorder);
    }
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    /** @type {HTMLCanvasElement} */
    this.canvas = this.shadowRoot.getElementById('canvas');
    /** @type {CanvasRenderingContext2D} */
    this.ctx = this.canvas.getContext('2d');

    this.setDimensions();

    if (this.autoplay) {
      this.play();
    }

    if (!this.interactive) {
      return;
    }

    /**
     * @param e {MouseEvent}
     */
    const mouseToToggle = e => {
      const {row, col} = this.clientCoordToRowCol(e);

      if (e.ctrlKey && col < this.width - 1 && row < this.width - 1) {
        this.drawGlider(row, col);
      } else {
        this.drawCell(row, col);
      }
    };

    this.canvas.addEventListener('mousemove', e => {
      // only do anything when the user is holding down click.
      if (e.buttons === 1) {
        mouseToToggle(e);
      }
    });

    this.canvas.addEventListener('mousedown', mouseToToggle);

    /**
     * @param e {TouchEvent}
     */
    const touchToToggle = e => {
      // stops Android pull-to-refresh behaviour that inhibits the
      // user from painting their cells.
      e.preventDefault();

      for (const touch of e.changedTouches) {
        this.paintCircle(touch);
      }

      this.draw();
    };

    this.canvas.addEventListener('touchstart', touchToToggle);
    this.canvas.addEventListener('touchmove', touchToToggle);
  }

  disconnectedCallback() {
    this.pause();
    this.#universe.free();
  }

  setDimensions() {
    this.#universe.resize_and_seed(this.width, this.height);
    this.#setCanvasDimensions();
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  screenCoordToCanvasCoord(x, y) {
    const boundingRect = this.canvas.getBoundingClientRect();

    const scaleX = this.canvas.width / boundingRect.width;
    const scaleY = this.canvas.height / boundingRect.height;

    const canvasLeft = (x - boundingRect.left) * scaleX;
    const canvasTop = (y - boundingRect.top) * scaleY;

    const row = Math.min(
      Math.floor(canvasTop / (this.cellSize + this.cellBorder)),
      this.height - this.cellBorder
    );
    const col = Math.min(
      Math.floor(canvasLeft / (this.cellSize + this.cellBorder)),
      this.width - this.cellBorder
    );

    return {row, col};
  }

  /**
   * @param e {MouseEvent | Touch}
   */
  clientCoordToRowCol(e) {
    return this.screenCoordToCanvasCoord(e.clientX, e.clientY);
  }

  /**
   * @param {number} row
   * @param {number} col
   */
  #getIndex(row, col) {
    return row * this.width + col;
  }

  draw() {
    if (this.cellBorder > 0) {
      this.drawGrid();
    }
    this.drawCells();
  }

  drawGrid() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.gridColor;

    for (let i = 0; i <= this.width; i++) {
      this.ctx.moveTo(i * (this.cellSize + this.cellBorder) + this.cellBorder, 0);
      this.ctx.lineTo(
        i * (this.cellSize + this.cellBorder) + this.cellBorder,
        (this.cellSize + this.cellBorder) * this.height + this.cellBorder
      );
    }

    for (let j = 0; j <= this.height; j++) {
      this.ctx.moveTo(0, j * (this.cellSize + this.cellBorder) + this.cellBorder);
      this.ctx.lineTo(
        (this.cellSize + this.cellBorder) * this.width + this.cellBorder,
        j * (this.cellSize + this.cellBorder) + this.cellBorder
      );
    }

    this.ctx.stroke();
  };

  drawCells() {
    const cellsPtr = this.#universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, this.width * this.height);

    this.ctx.beginPath();

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const idx = this.#getIndex(row, col);

        this.ctx.fillStyle = cells[idx] === Cell.Dead
          ? this.deadColor
          : this.aliveColor;

        this.ctx.fillRect(
          col * (this.cellSize + this.cellBorder) + this.cellBorder,
          row * (this.cellSize + this.cellBorder) + this.cellBorder,
          this.cellSize,
          this.cellSize
        );
      }
    }

    this.ctx.stroke();
  }

  /**
   * @param {number} row
   * @param {number} col
   */
  drawCell(row, col) {
    this.#universe.set_cell(row, col, Cell.Alive);
    this.draw();
  }

  /**
   * @param {number} row
   * @param {number} col
   */
  drawGlider(row, col) {
    this.#universe.set_cell(row, col, Cell.Alive);
    this.#universe.set_cell(row + 1, col + 1, Cell.Alive);
    this.#universe.set_cell(row + 2, col - 1, Cell.Alive);
    this.#universe.set_cell(row + 2, col, Cell.Alive);
    this.#universe.set_cell(row + 2, col + 1, Cell.Alive);
    this.draw();
  }

  /**
   * @param touch {Touch}
   */
  paintCircle(touch) {
    const {row: y, col: x} = this.clientCoordToRowCol(touch);
    const {row: rY, col: rX} = this.screenCoordToCanvasCoord(touch.radiusX, touch.radiusY);
    const radius = Math.max(4, rX, rY);
    this.#universe.draw_circle(x, y, radius);
  }

  pause() {
    cancelAnimationFrame(this.#animationId);
    this.#animationId = null;
  }

  play() {
    this.pause();

    let lastTick = performance.now();

    const renderLoop = ts => {
      let diff = ts - lastTick;

      if (diff >= this.tickRate) {
        lastTick = ts;
        this.#universe.tick();
        this.draw();
      }

      this.#animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  clear() {
    this.#universe.set_height(this.height);
    this.#universe.set_width(this.width);
    this.draw();
  }

  reset() {
    this.#universe.resize_and_seed(this.width, this.height);
    this.draw();
  }
}

window.customElements.define('game-of-life', GameOfLife);
