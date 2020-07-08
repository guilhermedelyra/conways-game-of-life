mod utils;
use std::fmt;
extern crate fixedbitset;
use wasm_bindgen::prelude::*;
extern crate js_sys;
use rand::Rng;

use fixedbitset::FixedBitSet;
extern crate web_sys;
use web_sys::console;

pub struct Timer<'a> {
    name: &'a str,
}

impl<'a> Timer<'a> {
    pub fn new(name: &'a str) -> Timer<'a> {
        console::time_with_label(name);
        Timer { name }
    }
}

impl<'a> Drop for Timer<'a> {
    fn drop(&mut self) {
        console::time_end_with_label(self.name);
    }
}

// // A macro to provide `println!(..)`-style syntax for `console.log` logging.
// macro_rules! log {
//     ( $( $t:tt )* ) => {
//         web_sys::console::log_1(&format!( $( $t )* ).into());
//     }
// }

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// #[wasm_bindgen]
pub struct Universe {
    size: usize,
    width: u32,
    height: u32,
    cells: Vec<FixedBitSet>,
    buffer: usize,
}

// #[wasm_bindgen]
impl Universe {
    pub fn new() -> Universe {
        utils::set_panic_hook();
        let mut rng = rand::thread_rng(); // for benches

        let width = 120;
        let height = 120;
        let size = (width * height) as usize;
        let mut cells = vec![FixedBitSet::with_capacity(size); 2];
        let buffer = 0;
        for i in 0..size {
            cells[buffer].set(i, rng.gen_range(0.0, 1.0) < 0.5); // js_sys::Math::random() < 0.5);
        }

        Universe {
            size,
            width,
            height,
            cells,
            buffer,
        }
    }

    pub fn set_alive(&mut self, row: u32, col: u32) {
        let idx = self.get_index(row % self.height(), col % self.width());
        self.cells[self.buffer].set(idx, true);
    }

    pub fn clear(&mut self) {
        for i in 0..self.size {
            self.cells[self.buffer].set(i, false);
        }
    }

    pub fn reset(&mut self) {
        let mut rng = rand::thread_rng(); // for benches
        for i in 0..self.size {
            self.cells[self.buffer].set(i, rng.gen_range(0.0, 1.0) < 0.5); // js_sys::Math::random() < 0.5);
        }
    }
    /// Set the width of the universe.
    ///
    /// Resets all cells to the dead state.
    pub fn set_width(&mut self, width: u32) {
        self.width = width;
        self.cells[0].clear();
        self.cells[1].clear();
    }

    /// Set the height of the universe.
    ///
    /// Resets all cells to the dead state.
    pub fn set_height(&mut self, height: u32) {
        self.height = height;
        self.cells[0].clear();
        self.cells[1].clear();
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const u32 {
        self.cells[self.buffer].as_slice().as_ptr()
    }
    pub fn render(&self) -> String {
        self.to_string()
    }

    fn get_index(&self, row: u32, column: u32) -> usize {
        (row * self.width + column) as usize
    }

    fn live_neighbor_count(&self, row: u32, column: u32) -> u8 {
        let mut count = 0;

        let north = if row == 0 { self.height - 1 } else { row - 1 };

        let south = if row == self.height - 1 { 0 } else { row + 1 };

        let west = if column == 0 {
            self.width - 1
        } else {
            column - 1
        };

        let east = if column == self.width - 1 {
            0
        } else {
            column + 1
        };

        let nw = self.get_index(north, west);
        count += self.cells[self.buffer][nw] as u8;

        let n = self.get_index(north, column);
        count += self.cells[self.buffer][n] as u8;

        let ne = self.get_index(north, east);
        count += self.cells[self.buffer][ne] as u8;

        let w = self.get_index(row, west);
        count += self.cells[self.buffer][w] as u8;

        let e = self.get_index(row, east);
        count += self.cells[self.buffer][e] as u8;

        let sw = self.get_index(south, west);
        count += self.cells[self.buffer][sw] as u8;

        let s = self.get_index(south, column);
        count += self.cells[self.buffer][s] as u8;

        let se = self.get_index(south, east);
        count += self.cells[self.buffer][se] as u8;

        count
    }
    pub fn toggle_cell(&mut self, row: u32, column: u32) {
        let idx = self.get_index(row, column);
        let cell = !self.cells[self.buffer][idx];
        self.cells[self.buffer].set(idx, cell);
    }

    pub fn tick(&mut self) {
        // let _timer = Timer::new("Universe::tick");
        let next_buffer = 1 - self.buffer;

        // let mut next = self.cells[self.buffer].clone();
        // let mut revived = Vec::new();
        // let mut died = Vec::new();
        // let mut next = {
        // //    let _timer = Timer::new("allocate next cells");
        //     self.cells[self.buffer].clone()
        // };

        // let _timer = Timer::new("new generation");
        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[self.buffer][idx];
                let live_neighbors = self.live_neighbor_count(row, col);

                self.cells[next_buffer].set(
                    idx,
                    match (cell, live_neighbors) {
                        (true, x) if x < 2 || x > 3 => false,
                        (true, 2..=3) => true,
                        (false, 3) => true,
                        (otherwise, _) => otherwise,
                    },
                );

                // if self.cells[next_buffer][idx] != cell {
                //     if cell == true {
                //         died.push(idx);
                //     } else {
                //         revived.push(idx);
                //     }
                // }
            }
        }

        // let _timer = Timer::new("free old cells");
        self.buffer = next_buffer;
        // self.cells[self.buffer] = next;
    }
}

impl Universe {
    /// Get the dead and alive values of the entire universe.
    pub fn get_cells(&self) -> &FixedBitSet {
        &self.cells[self.buffer]
    }

    /// Set cells to be alive in a universe by passing the row and column
    /// of each cell as an array.
    pub fn set_cells(&mut self, cells: &[(u32, u32)]) {
        for (row, col) in cells.iter().cloned() {
            let idx = self.get_index(row, col);
            self.cells[self.buffer].set(idx, true);
        }
    }
}

impl fmt::Display for Universe {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[self.buffer][idx];
                let symbol = if cell == false { '◻' } else { '◼' };
                write!(f, "{}", symbol)?;
            }
            write!(f, "\n")?;
        }

        Ok(())
    }
}
