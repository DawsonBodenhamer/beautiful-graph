pub const NODE_WIDTH: usize = 10;
pub const LINK_WIDTH: usize = 2;
const X: usize = 0;
const Y: usize = 1;
const VX: usize = 2;
const VY: usize = 3;
const FX: usize = 4;
const FY: usize = 5;
const DEGREE: usize = 6;
const RADIUS: usize = 7;
const FIX_X: usize = 8;
const FIX_Y: usize = 9;
const VELOCITY_RETENTION: f64 = 0.6;
const COLLISION_STRENGTH: f64 = 0.5;
const MIN_DISTANCE_SQUARED: f64 = 30.0 * 30.0;
const JIGGLE_SCALE: f64 = 1e-6;
const BARNES_HUT_THETA_SQUARED: f64 = 0.9 * 0.9;

pub struct Quad {
    cx: f64,
    cy: f64,
    half: f64,
    mass: f64,
    mx: f64,
    my: f64,
    point: i32,
    children: [i32; 4],
}

impl Quad {
    fn new(cx: f64, cy: f64, half: f64) -> Self {
        Self {
            cx,
            cy,
            half,
            mass: 0.0,
            mx: 0.0,
            my: 0.0,
            point: -1,
            children: [-1; 4],
        }
    }
}

pub struct ForceConfig {
    pub alpha: f64,
    pub center: f64,
    pub charge: f64,
    pub link: f64,
    pub distance: f64,
}

pub fn tick(
    nodes: &mut [f64],
    links: &[u32],
    config: ForceConfig,
    random_state: &mut u32,
    quads: &mut Vec<Quad>,
) -> Result<(), ()> {
    if nodes.len() % NODE_WIDTH != 0
        || links.len() % LINK_WIDTH != 0
        || ![
            config.alpha,
            config.center,
            config.charge,
            config.link,
            config.distance,
        ]
        .iter()
        .all(|value| value.is_finite())
    {
        return Err(());
    }
    link_force(nodes, links, &config, random_state)?;
    center_and_charge(nodes, &config, random_state, quads);
    collision(nodes, random_state);
    integrate(nodes);
    if nodes.iter().all(|value| value.is_finite()) {
        Ok(())
    } else {
        Err(())
    }
}

fn link_force(
    nodes: &mut [f64],
    links: &[u32],
    config: &ForceConfig,
    rng: &mut u32,
) -> Result<(), ()> {
    let count = nodes.len() / NODE_WIDTH;
    for edge in links.chunks_exact(LINK_WIDTH) {
        let source = edge[0] as usize;
        let target = edge[1] as usize;
        if source >= count || target >= count || source == target {
            return Err(());
        }
        let si = source * NODE_WIDTH;
        let ti = target * NODE_WIDTH;
        let mut dx = nodes[ti + X] + nodes[ti + VX] - nodes[si + X] - nodes[si + VX];
        let mut dy = nodes[ti + Y] + nodes[ti + VY] - nodes[si + Y] - nodes[si + VY];
        if dx == 0.0 {
            dx = jiggle(rng);
        }
        if dy == 0.0 {
            dy = jiggle(rng);
        }
        let length = dx.hypot(dy);
        let source_degree = nodes[si + DEGREE].max(1.0);
        let target_degree = nodes[ti + DEGREE].max(1.0);
        let factor = (length - config.distance) / length * config.alpha * config.link
            / source_degree.min(target_degree);
        let bias = source_degree / (source_degree + target_degree);
        dx *= factor;
        dy *= factor;
        nodes[ti + VX] -= dx * bias;
        nodes[ti + VY] -= dy * bias;
        nodes[si + VX] += dx * (1.0 - bias);
        nodes[si + VY] += dy * (1.0 - bias);
    }
    Ok(())
}

fn center_and_charge(
    nodes: &mut [f64],
    config: &ForceConfig,
    rng: &mut u32,
    quads: &mut Vec<Quad>,
) {
    let count = nodes.len() / NODE_WIDTH;
    for index in 0..count {
        let i = index * NODE_WIDTH;
        nodes[i + VX] -= nodes[i + X] * config.center * config.alpha;
        nodes[i + VY] -= nodes[i + Y] * config.center * config.alpha;
    }
    build_quadtree(nodes, quads);
    if quads.is_empty() {
        return;
    }
    for index in 0..count {
        let i = index * NODE_WIDTH;
        let (mut vx, mut vy) = (nodes[i + VX], nodes[i + VY]);
        apply_charge(0, index, nodes, quads, config, rng, &mut vx, &mut vy);
        nodes[i + VX] = vx;
        nodes[i + VY] = vy;
    }
}

fn build_quadtree(nodes: &[f64], quads: &mut Vec<Quad>) {
    quads.clear();
    if nodes.is_empty() {
        return;
    }
    let (mut min_x, mut min_y, mut max_x, mut max_y) = (
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    );
    for node in nodes.chunks_exact(NODE_WIDTH) {
        min_x = min_x.min(node[X]);
        min_y = min_y.min(node[Y]);
        max_x = max_x.max(node[X]);
        max_y = max_y.max(node[Y]);
    }
    let half = (max_x - min_x).max(max_y - min_y).max(1.0) / 2.0 + JIGGLE_SCALE;
    quads.push(Quad::new(
        (min_x + max_x) / 2.0,
        (min_y + max_y) / 2.0,
        half,
    ));
    for point in 0..nodes.len() / NODE_WIDTH {
        insert_point(0, point, 0, nodes, quads);
    }
    accumulate(0, nodes, quads);
}

fn insert_point(index: usize, point: usize, depth: usize, nodes: &[f64], quads: &mut Vec<Quad>) {
    if quads[index].point < 0 && quads[index].children[0] < 0 {
        quads[index].point = point as i32;
        return;
    }
    if depth >= 40 {
        return;
    }
    if quads[index].children[0] < 0 {
        let existing = quads[index].point;
        quads[index].point = -1;
        split(index, quads);
        if existing >= 0 {
            let child = child_for(
                index,
                nodes[existing as usize * NODE_WIDTH + X],
                nodes[existing as usize * NODE_WIDTH + Y],
                quads,
            );
            insert_point(child, existing as usize, depth + 1, nodes, quads);
        }
    }
    let offset = point * NODE_WIDTH;
    let child = child_for(index, nodes[offset + X], nodes[offset + Y], quads);
    insert_point(child, point, depth + 1, nodes, quads);
}

fn split(index: usize, quads: &mut Vec<Quad>) {
    let (cx, cy, half) = (quads[index].cx, quads[index].cy, quads[index].half / 2.0);
    for child in 0..4 {
        let x = cx + if child & 1 != 0 { half } else { -half };
        let y = cy + if child & 2 != 0 { half } else { -half };
        quads[index].children[child] = quads.len() as i32;
        quads.push(Quad::new(x, y, half));
    }
}

fn child_for(index: usize, x: f64, y: f64, quads: &[Quad]) -> usize {
    let slot = usize::from(x >= quads[index].cx) | (usize::from(y >= quads[index].cy) << 1);
    quads[index].children[slot] as usize
}

fn accumulate(index: usize, nodes: &[f64], quads: &mut [Quad]) {
    if quads[index].children[0] < 0 {
        if quads[index].point >= 0 {
            let offset = quads[index].point as usize * NODE_WIDTH;
            quads[index].mass = 1.0;
            quads[index].mx = nodes[offset + X];
            quads[index].my = nodes[offset + Y];
        }
        return;
    }
    let children = quads[index].children;
    for child in children {
        let child = child as usize;
        accumulate(child, nodes, quads);
        quads[index].mass += quads[child].mass;
        quads[index].mx += quads[child].mx;
        quads[index].my += quads[child].my;
    }
}

#[allow(clippy::too_many_arguments)]
fn apply_charge(
    index: usize,
    point: usize,
    nodes: &[f64],
    quads: &[Quad],
    config: &ForceConfig,
    rng: &mut u32,
    vx: &mut f64,
    vy: &mut f64,
) {
    let quad = &quads[index];
    if quad.mass == 0.0 {
        return;
    }
    let offset = point * NODE_WIDTH;
    let mut dx = quad.mx / quad.mass - nodes[offset + X];
    let mut dy = quad.my / quad.mass - nodes[offset + Y];
    if dx == 0.0 {
        dx = jiggle(rng)
    }
    if dy == 0.0 {
        dy = jiggle(rng)
    }
    let mut distance_squared = dx * dx + dy * dy;
    let internal = quad.children[0] >= 0;
    if internal && (quad.half * 2.0).powi(2) >= BARNES_HUT_THETA_SQUARED * distance_squared {
        for child in quad.children {
            if child >= 0 {
                apply_charge(child as usize, point, nodes, quads, config, rng, vx, vy)
            }
        }
        return;
    }
    let mass = if internal {
        quad.mass
    } else if quad.point == point as i32 {
        quad.mass - 1.0
    } else {
        quad.mass
    };
    if mass <= 0.0 {
        return;
    }
    if distance_squared < MIN_DISTANCE_SQUARED {
        distance_squared = (MIN_DISTANCE_SQUARED * distance_squared).sqrt()
    }
    let scale = config.charge * mass * config.alpha / distance_squared;
    *vx += dx * scale;
    *vy += dy * scale;
}

fn collision(nodes: &mut [f64], rng: &mut u32) {
    let count = nodes.len() / NODE_WIDTH;
    for left in 0..count {
        for right in left + 1..count {
            let a = left * NODE_WIDTH;
            let b = right * NODE_WIDTH;
            let radius_a = nodes[a + RADIUS].max(60.0);
            let radius_b = nodes[b + RADIUS].max(60.0);
            let radius = radius_a + radius_b;
            let mut dx = nodes[a + X] + nodes[a + VX] - nodes[b + X] - nodes[b + VX];
            let mut dy = nodes[a + Y] + nodes[a + VY] - nodes[b + Y] - nodes[b + VY];
            if dx == 0.0 {
                dx = jiggle(rng);
            }
            if dy == 0.0 {
                dy = jiggle(rng);
            }
            let distance_squared = dx * dx + dy * dy;
            if distance_squared >= radius * radius {
                continue;
            }
            let distance = distance_squared.sqrt();
            let factor = (radius - distance) / distance * COLLISION_STRENGTH;
            let share = radius_b * radius_b / (radius_a * radius_a + radius_b * radius_b);
            dx *= factor;
            dy *= factor;
            nodes[a + VX] += dx * share;
            nodes[a + VY] += dy * share;
            nodes[b + VX] -= dx * (1.0 - share);
            nodes[b + VY] -= dy * (1.0 - share);
        }
    }
}

fn integrate(nodes: &mut [f64]) {
    for node in nodes.chunks_exact_mut(NODE_WIDTH) {
        if node[FIX_X] == 0.0 {
            node[VX] *= VELOCITY_RETENTION;
            node[X] += node[VX];
        } else {
            node[X] = node[FX];
            node[VX] = 0.0;
        }
        if node[FIX_Y] == 0.0 {
            node[VY] *= VELOCITY_RETENTION;
            node[Y] += node[VY];
        } else {
            node[Y] = node[FY];
            node[VY] = 0.0;
        }
    }
}

fn jiggle(state: &mut u32) -> f64 {
    *state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
    (f64::from(*state) / 4_294_967_296.0 - 0.5) * JIGGLE_SCALE
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(x: f64, y: f64, radius: f64) -> [f64; NODE_WIDTH] {
        [x, y, 0.0, 0.0, 0.0, 0.0, 1.0, radius, 0.0, 0.0]
    }

    #[test]
    fn center_damping_and_integration_are_finite() {
        let mut nodes = node(100.0, -50.0, 60.0).to_vec();
        nodes[VX] = 2.0;
        nodes[VY] = -1.0;
        tick(
            &mut nodes,
            &[],
            ForceConfig {
                alpha: 1.0,
                center: 0.1,
                charge: -1000.0,
                link: 1.0,
                distance: 250.0,
            },
            &mut 1,
            &mut Vec::new(),
        )
        .unwrap();
        assert!(nodes.iter().all(|value| value.is_finite()));
        assert!(nodes[X] < 100.0);
        assert!(nodes[Y] > -50.0);
    }

    #[test]
    fn expanded_collision_radius_separates_predicted_positions() {
        let mut nodes = [node(0.0, 0.0, 72.0), node(90.0, 0.0, 60.0)].concat();
        collision(&mut nodes, &mut 1);
        assert!(nodes[VX] < 0.0);
        assert!(nodes[NODE_WIDTH + VX] > 0.0);
    }

    #[test]
    fn invalid_memory_shapes_and_links_fail_closed() {
        let config = ForceConfig {
            alpha: 1.0,
            center: 0.1,
            charge: -1000.0,
            link: 1.0,
            distance: 250.0,
        };
        assert!(tick(&mut [0.0], &[], config, &mut 1, &mut Vec::new()).is_err());
        let mut nodes = node(0.0, 0.0, 60.0).to_vec();
        let config = ForceConfig {
            alpha: 1.0,
            center: 0.1,
            charge: -1000.0,
            link: 1.0,
            distance: 250.0,
        };
        assert!(tick(&mut nodes, &[0, 4], config, &mut 1, &mut Vec::new()).is_err());
    }

    #[test]
    fn zero_distance_jiggle_is_deterministic() {
        let initial = [node(0.0, 0.0, 60.0), node(0.0, 0.0, 60.0)].concat();
        let mut first = initial.clone();
        let mut second = initial;
        let config = || ForceConfig {
            alpha: 1.0,
            center: 0.1,
            charge: -1000.0,
            link: 1.0,
            distance: 250.0,
        };
        tick(&mut first, &[], config(), &mut 1, &mut Vec::new()).unwrap();
        tick(&mut second, &[], config(), &mut 1, &mut Vec::new()).unwrap();
        assert_eq!(first, second);
    }

    #[test]
    fn non_finite_state_is_rejected() {
        let mut nodes = node(f64::NAN, 0.0, 60.0).to_vec();
        let config = ForceConfig {
            alpha: 1.0,
            center: 0.1,
            charge: -1000.0,
            link: 1.0,
            distance: 250.0,
        };
        assert!(tick(&mut nodes, &[], config, &mut 1, &mut Vec::new()).is_err());
    }
}
