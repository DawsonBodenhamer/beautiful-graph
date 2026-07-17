use std::sync::Mutex;

use crate::simulation::{tick, ForceConfig, Quad, LINK_WIDTH, NODE_WIDTH};

const ABI_VERSION: u32 = 1;
static STATE: Mutex<State> = Mutex::new(State::new());

struct State {
    nodes: Vec<f64>,
    links: Vec<u32>,
    quads: Vec<Quad>,
    random_state: u32,
}

impl State {
    const fn new() -> Self {
        Self {
            nodes: Vec::new(),
            links: Vec::new(),
            quads: Vec::new(),
            random_state: 1,
        }
    }
}

#[no_mangle]
pub extern "C" fn bg_abi_version() -> u32 {
    ABI_VERSION
}

#[no_mangle]
pub extern "C" fn bg_reserve_nodes(count: usize) -> *mut f64 {
    let mut state = STATE.lock().expect("simulation state poisoned");
    state.nodes.resize(count.saturating_mul(NODE_WIDTH), 0.0);
    state.nodes.as_mut_ptr()
}

#[no_mangle]
pub extern "C" fn bg_reserve_links(count: usize) -> *mut u32 {
    let mut state = STATE.lock().expect("simulation state poisoned");
    state.links.resize(count.saturating_mul(LINK_WIDTH), 0);
    state.links.as_mut_ptr()
}

#[no_mangle]
pub extern "C" fn bg_tick(
    node_count: usize,
    link_count: usize,
    alpha: f64,
    center: f64,
    charge: f64,
    link: f64,
    distance: f64,
) -> i32 {
    let mut state = STATE.lock().expect("simulation state poisoned");
    if node_count.saturating_mul(NODE_WIDTH) > state.nodes.len()
        || link_count.saturating_mul(LINK_WIDTH) > state.links.len()
    {
        return 1;
    }
    let State {
        nodes,
        links,
        quads,
        random_state,
    } = &mut *state;
    let result = tick(
        &mut nodes[..node_count * NODE_WIDTH],
        &links[..link_count * LINK_WIDTH],
        ForceConfig {
            alpha,
            center,
            charge,
            link,
            distance,
        },
        random_state,
        quads,
    );
    if result.is_ok() {
        0
    } else {
        2
    }
}

#[no_mangle]
pub extern "C" fn bg_validate_finite(node_count: usize) -> i32 {
    let state = STATE.lock().expect("simulation state poisoned");
    if node_count.saturating_mul(NODE_WIDTH) > state.nodes.len() {
        return 1;
    }
    if state.nodes[..node_count * NODE_WIDTH]
        .iter()
        .all(|value| value.is_finite())
    {
        0
    } else {
        2
    }
}
