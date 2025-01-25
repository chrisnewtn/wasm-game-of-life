//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use std::assert_eq;

use wasm_bindgen_test::*;

extern crate wasm_game_of_life;
use wasm_game_of_life::Universe;

wasm_bindgen_test_configure!(run_in_browser);

#[cfg(test)]
pub fn empty_universe(size: u32) -> Universe {
    let mut universe = Universe::new();
    universe.set_width(size);
    universe.set_height(size);
    universe
}

#[cfg(test)]
pub fn input_spaceship() -> Universe {
    let mut universe = Universe::new();
    universe.set_width(6);
    universe.set_height(6);
    universe.set_cells(&[(1,2), (2,3), (3,1), (3,2), (3,3)]);
    universe
}

#[cfg(test)]
pub fn expected_spaceship() -> Universe {
    let mut universe = Universe::new();
    universe.set_width(6);
    universe.set_height(6);
    universe.set_cells(&[(2,1), (2,3), (3,2), (3,3), (4,2)]);
    universe
}

#[wasm_bindgen_test]
fn test_tick() {
    let mut input_universe = input_spaceship();

    let expected_universe = expected_spaceship();

    input_universe.tick();

    assert_eq!(&input_universe.get_cells(), &expected_universe.get_cells());
}

#[cfg(test)]
pub fn expected_circle() -> Universe {
    let mut universe = empty_universe(5);
    universe.set_cells(&[
        (0,1), (0,2), (0,3),
        (1,0), (1,4),
        (2,0), (2,4),
        (3,0), (3,4),
        (4,1), (4,2), (4,3),
    ]);
    universe
}

#[wasm_bindgen_test]
fn test_circle() {
    let mut input_universe = empty_universe(5);

    let expected_universe = expected_circle();

    input_universe.draw_circle(2, 2, 2);

    assert_eq!(&input_universe.get_cells(), &expected_universe.get_cells());
}

#[cfg(test)]
pub fn expected_wrapped_circle() -> Universe {
    let mut universe = empty_universe(5);
    universe.set_cells(&[
        (1,2), (1,3), (1,4),
        (2,1), (2,0),
        (3,1), (3,0),
        (4,1), (4,0),
        (0,2), (0,3), (0,4),
    ]);
    universe
}

#[wasm_bindgen_test]
fn wraps_circle_around() {
    let mut input_universe = empty_universe(5);

    let expected_universe = expected_wrapped_circle();

    input_universe.draw_circle(3, 3, 2);

    assert_eq!(&input_universe.get_cells(), &expected_universe.get_cells());
}
