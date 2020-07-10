import { Universe } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

const CELL_SIZE = 12; // px
const GRID_COLOR = "#2c314e";
const DEAD_COLOR = "#1e1f21";
const ALIVE_COLOR = "#aca8b0";

// Construct the universe, and get its width and height.
const universe = Universe.new();
const width = universe.width();
const height = universe.height();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const ctx = canvas.getContext("2d");

let animationId = null;

const fps = new (class {
  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = (1 / delta) * 1000;

    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 20) {
      this.frames.shift();
    }

    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    // Render the statistics.
    this.fps.textContent = `
Frames per Second:
        latest => ${Math.round(fps)}fps
avg of last 20 => ${Math.round(mean)}fps
min of last 20 => ${Math.round(min)}fps
max of last 20 => ${Math.round(max)}fps
`.trim();
  }
})();

const renderLoop = () => {
  fps.render(); //new

  universe.tick();
  drawGrid();
  drawCells();

  animationId = requestAnimationFrame(renderLoop);
};

const isPaused = () => {
  return animationId === null;
};

const playPauseButton = document.getElementById("play-pause");
const resetButton = document.getElementById("reset-board");
const clearButton = document.getElementById("clear-board");
resetButton.textContent = "re-generate";
resetButton.addEventListener("click", (event) => {
  universe.reset();
  if (isPaused()) {
    play();
    pause();
  }
});

clearButton.textContent = "clear";
clearButton.addEventListener("click", (event) => {
  universe.clear();
  if (isPaused()) {
    play();
    pause();
  }
});
const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", (event) => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const getIndex = (row, column) => {
  return row * width + column;
};

const bitIsSet = (n, arr) => {
  const byte = Math.floor(n / 8);
  const mask = 1 << n % 8;
  return (arr[byte] & mask) === mask;
};

const drawCells = () => {
  const cellsPtr = universe.cells();

  // This is updated!
  const cells = new Uint8Array(memory.buffer, cellsPtr, (width * height) / 8);

  ctx.beginPath();

  // Alive cells.
  ctx.fillStyle = ALIVE_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (!bitIsSet(idx, cells)) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  // Dead cells.
  ctx.fillStyle = DEAD_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (bitIsSet(idx, cells)) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

canvas.addEventListener("click", (event) => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  if (event.ctrlKey) {
    // glider
    universe.set_alive(row - 1, col);
    universe.set_alive(row, col + 1);
    universe.set_alive(row + 1, col - 1);
    universe.set_alive(row + 1, col);
    universe.set_alive(row + 1, col + 1);
  } else if (event.shiftKey) {
    for (let i = 0; i < 2; ++i) {
      for (let j = 0; j < 2; ++j) {
        universe.set_alive(row + (i === 0 ? 6 : -6), col + (j === 0 ? 4 : -4));
        universe.set_alive(row + (i === 0 ? 6 : -6), col + (j === 0 ? 3 : -3));
        universe.set_alive(row + (i === 0 ? 6 : -6), col + (j === 0 ? 2 : -2));

        universe.set_alive(row + (i === 0 ? 4 : -4), col + (j === 0 ? 6 : -6));
        universe.set_alive(row + (i === 0 ? 4 : -4), col + (j === 0 ? 1 : -1));
        universe.set_alive(row + (i === 0 ? 3 : -3), col + (j === 0 ? 6 : -6));
        universe.set_alive(row + (i === 0 ? 3 : -3), col + (j === 0 ? 1 : -1));
        universe.set_alive(row + (i === 0 ? 2 : -2), col + (j === 0 ? 6 : -6));
        universe.set_alive(row + (i === 0 ? 2 : -2), col + (j === 0 ? 1 : -1));

        universe.set_alive(row + (i === 0 ? 1 : -1), col + (j === 0 ? 4 : -4));
        universe.set_alive(row + (i === 0 ? 1 : -1), col + (j === 0 ? 3 : -3));
        universe.set_alive(row + (i === 0 ? 1 : -1), col + (j === 0 ? 2 : -2));
      }
    }
  } else {
    universe.toggle_cell(row, col);
  }

  drawGrid();
  drawCells();
});

drawGrid();
drawCells();
play();
