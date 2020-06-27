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

var slider = document.getElementById("fps");
var output = document.getElementById("showfps");
output.innerHTML = slider.value;

slider.oninput = function () {
  output.innerHTML = this.value;
};

var Timer = function (callback, delay) {
  var timerId,
    start,
    remaining = delay;

  this.pause = function () {
    window.clearTimeout(timerId);
    remaining -= Date.now() - start;
  };

  this.resume = function () {
    start = Date.now();
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, remaining);
  };

  this.resume();
};

var timer = null;
const renderLoop = () => {
  //debugger;
  universe.tick();

  drawGrid();
  drawCells();
  timer = new Timer(() => {
    animationId = requestAnimationFrame(renderLoop);
  }, 1000 / slider.value);
};

const isPaused = () => {
  return animationId === null;
};

const playPauseButton = document.getElementById("play-pause");
const resetButton = document.getElementById("reset-board");
const clearButton = document.getElementById("clear-board");
resetButton.textContent = "re-generate";
resetButton.addEventListener("click", (event) => {
  timer.pause();
  universe.reset();
  timer.resume();
});

clearButton.textContent = "clear";
clearButton.addEventListener("click", (event) => {
  universe.clear();
});
const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
  timer.resume();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
  timer.pause();
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

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);

      // This is updated!
      ctx.fillStyle = bitIsSet(idx, cells) ? ALIVE_COLOR : DEAD_COLOR;

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
