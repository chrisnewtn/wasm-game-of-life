mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

impl Cell {
    fn toggle(&mut self) {
        *self = match *self {
            Cell::Dead => Cell::Alive,
            Cell::Alive => Cell::Dead,
        }
    }
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<Cell>,
}

fn generate_cells(width: u32, height: u32) -> Vec<Cell> {
    (0..width * height)
        .map(|i| {
            if i % 2 == 0 || i % 7 == 0 {
                Cell::Alive
            } else {
                Cell::Dead
            }
        })
        .collect()
}

#[wasm_bindgen]
impl Universe {
    pub fn new() -> Universe {
        utils::set_panic_hook();

        let width = 64;
        let height = 64;

        let cells = generate_cells(width, height);

        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }

    pub fn set_width(&mut self, width: u32) {
        self.width = width;
        self.cells = (0..width * self.height).map(|_| Cell::Dead).collect();
    }

    pub fn set_height(&mut self, height: u32) {
        self.height = height;
        self.cells = (0..self.width * height).map(|_| Cell::Dead).collect();
    }

    pub fn seed_cells(&mut self) {
        self.cells = generate_cells(self.width, self.height);
    }

    pub fn resize_and_seed(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
        self.seed_cells();
    }

    pub fn toggle_cell(&mut self, row: u32, column: u32) {
        let idx = self.get_index(row, column);
        self.cells[idx].toggle();
    }

    pub fn set_cell(&mut self, row: u32, column: u32, cell: Cell) {
        let idx = self.get_index(row, column);
        self.cells[idx] = cell;
    }

    pub fn draw_circle(&mut self, c_x: u32, c_y: u32, radius: u32) {
        let mut d: f64 = (5.0 - radius as f64 * 4.0) / 4.0;
        let mut x = 0;
        let mut y = radius;

        loop {
            self.set_cells(&[
                 (c_y + y, c_x + x),
                 (c_y - y, c_x + x),
                 (c_y + y, c_x - x),
                 (c_y - y, c_x - x),
                 (c_y + x, c_x + y),
                 (c_y - x, c_x + y),
                 (c_y + x, c_x - y),
                 (c_y - x, c_x - y),
            ]);

            if d < 0.0 {
                d += 2.0 * x as f64 + 1.0;
            } else {
                d += 2.0 * (x as f64 - y as f64) + 1.0;
                y = (y + (self.height - 1)) % self.height;
            }

            x = (x + 1) % self.width;

            if x > y {
                break;
            }
        }
    }

    fn get_index(&self, row: u32, column: u32) -> usize {
        let row = row % self.height;
        let column = column % self.width;
        (row * self.width + column) as usize
    }

    fn live_neighbor_count(&self, row: u32, column: u32) -> u8 {
        let mut count = 0;

        for delta_row in [self.height - 1, 0, 1].iter().cloned() {
            for delta_col in [self.width - 1, 0, 1].iter().cloned() {
                if delta_row == 0 && delta_col == 0 {
                    continue;
                }

                let neighbor_row = (row + delta_row) % self.height;
                let neighbor_col = (column + delta_col) % self.width;
                let idx = self.get_index(neighbor_row, neighbor_col);

                count += self.cells[idx] as u8;
            }
        }

        count
    }

    pub fn tick(&mut self) {
        let mut next = self.cells.clone();

        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[idx];
                let live_neighbors = self.live_neighbor_count(row, col);

                let next_cell = match (cell, live_neighbors) {
                    (Cell::Alive, x) if x < 2 => Cell::Dead,
                    (Cell::Alive, 2) | (Cell::Alive, 3) => Cell::Alive,
                    (Cell::Alive, x) if x > 3 => Cell::Dead,
                    (Cell::Dead, 3) => Cell::Alive,
                    (otherwise, _) => otherwise,
                };

                next[idx] = next_cell;
            }
        }

        self.cells = next;
    }
}

impl Universe {
    pub fn get_cells(&self) -> &[Cell] {
        &self.cells
    }

    pub fn set_cells(&mut self, cells: &[(u32, u32)]) {
        for (row, col) in cells.iter().cloned() {
            self.set_cell(row, col, Cell::Alive);
        }
    }
}
