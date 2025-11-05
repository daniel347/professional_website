// variable for the namespace
const svgns = "http://www.w3.org/2000/svg";
const svg = document.querySelector("svg");

function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

const ar2 = function (l1, l2, L, x) {
  if (!x) {
    x = [0, 0]
  }

  let sigma = Math.sqrt(1 - l1 - l2)

  for (let i = 1; i < L-1; i++) {
    x.push(x[i] * l1 + x[i-1] * l2 + sigma * gaussianRandom())
  }

  return x
}

const N_ar = 4;

const dark_colours = ["#3a2e39", "#544653", "#6e5e6c", "#877586"]
const light_colours = ["#475bca", "#6e77cd", "#97a6d5", "#b8bdc4"]// ["#7677c1", "#a6acd2", "#b9c4da", "#dde5f4" ]

const dark_accent = "#f1c40f"
const light_accent = "#f5b626"

const line_colours = light_colours // ["#3a2e39", "#544653", "#6e5e6c", "#877586"]
const accent_colour = light_accent

const scale_params = {
    scale_y: 100,
    scale_x: 50,
    offset_x: 100,
    offset_y: 10,

    max_x_lim: 150-8,
    min_x_lim: 0,

    header_point: {"H1": 230, "H2": 200, "H3": 170, "H4": 140},

    dither_scale: 2
}

function scale_coord(x, y, params) {
    let x_new = params.scale_x * x + params.offset_x;
    let y_new = params.scale_y * y + params.offset_y;

    x_new = Math.min(Math.max(x_new, params.min_x_lim), params.max_x_lim);
    return {x: x_new, y: y_new}
}

let content_bottom;
let is_frontpage = document.location.pathname === "/"

content_bottom = document.getElementById("left_graphic_size").getBoundingClientRect().bottom;

/*
if (is_frontpage) {
    content_bottom = document.getElementByID(".pagination").getBoundingClientRect().bottom;
}
else {
    content_bottom = document.querySelector(".post").getBoundingClientRect().bottom;
}
 */

const headers = document.querySelectorAll(is_frontpage ? "h1" : "h1, h2, h3, h4");
let header_coords = [];
const svg_top = svg.getBoundingClientRect().top;



const L = Math.ceil((content_bottom - svg_top)/scale_params.scale_y)

for (let i = 0; i < headers.length; i++) {
    const header_rect = headers[i].getBoundingClientRect();
    header_coords.push({x: scale_params.header_point[headers[i].nodeName], y:(header_rect.top + header_rect.bottom)/2 - svg_top});
}

let draw_points = []
for (let j = 0; j < N_ar; j++) {
    let ar_vals = ar2(-0.01, 0.7, L, [gaussianRandom(), gaussianRandom()])

    let line_points = []
    for (let i = 0; i < L; i++) {
        let coords = scale_coord(ar_vals[i], i, scale_params)
        coords.colour = line_colours[j];

        if (j === N_ar - 1) {
            for (let k = 0; k < header_coords.length; k++) {
                if (Math.abs(coords.y - header_coords[k].y) < scale_params.scale_y / 2) {
                    coords.y = header_coords[k].y
                    coords.x = header_coords[k].x;
                    coords.colour = accent_colour;
                }
            }
        }
        line_points.push(coords)
    }
    draw_points.push(line_points)
}

let random_dither = [];
for (let j = 0; j < N_ar; j++) {
    random_dither.push([]);
    for (let i = 0; i < L; i++) {
        random_dither[j].push({x: gaussianRandom()*scale_params.dither_scale,
                                y: gaussianRandom()*scale_params.dither_scale});
    }
}

let ar_elements = []
for (let j = 0; j < N_ar; j++) {
    ar_elements.push([])
    for (let i = 0; i < draw_points[j].length; i++) {
        ar_elements[j].push({circle: undefined, line_in: undefined, line_out: undefined})
    }
}


for (let j = 0; j < N_ar; j++) {
    for (let i = 0; i < draw_points[j].length; i++) {
        if (i >= 1) {
            let newLine = document.createElementNS(svgns, "line");
            gsap.set(newLine, {
                attr: {
                    x1: draw_points[j][i-1].x,
                    y1: draw_points[j][i-1].y,
                    x2: draw_points[j][i].x,
                    y2: draw_points[j][i].y,
                    stroke: line_colours[j],
                }
            });
            svg.appendChild(newLine);
            ar_elements[j][i].line_in = newLine;
            ar_elements[j][i-1].line_out = newLine;
        }
    }

    for (let i = 0; i < draw_points[j].length; i++) {
        let newCircle = document.createElementNS(svgns, "circle");
        gsap.set(newCircle, {
            attr: {
                cx: draw_points[j][i].x,
                cy: draw_points[j][i].y,
                r: 8,
                fill: draw_points[j][i].colour,
            }
        });
        svg.appendChild(newCircle);
        ar_elements[j][i].circle = newCircle;
    }
}

gsap.ticker.add(draw);

let mouseover = false;

let svg_mousepos = {x: 0, y: 0};

function draw() {
    if (mouseover) {
        move_ar_points();
    }
}

function move_ar_elem(elem, draw_pos, dx, dy) {
    const new_x = draw_pos.x + dx;
    const new_y = draw_pos.y + dy;
    gsap.to(elem.circle, {x: dx, y: dy, duration: 0.3});
    gsap.to(elem.line_in, {attr: {x2: new_x, y2: new_y}});
    gsap.to(elem.line_out,{attr: {x1: new_x, y1: new_y}});
}

function update_random_dither() {
    const alpha = 0.003;
    for (let j = 0; j < N_ar; j++) {
        for (let i = 0; i < L; i++) {
            random_dither[j][i].x = Math.sqrt(alpha) * random_dither[j][i].x + Math.sqrt(1-alpha) * gaussianRandom()*scale_params.dither_scale;
            random_dither[j][i].y = Math.sqrt(alpha) * random_dither[j][i].y + Math.sqrt(1-alpha) * gaussianRandom()*scale_params.dither_scale;
        }
    }
}

function move_ar_points() {
    const lam = 10;

    for (let l = 0; l < N_ar; l++) {
        for (let k = 0; k < draw_points[l].length; k++) {
            if (Math.abs(draw_points[l][k].y - svg_mousepos.y) < scale_params.scale_y) {
              let dx = (draw_points[l][k].x - svg_mousepos.x)
              let dy =  (draw_points[l][k].y - svg_mousepos.y)
              let dist = Math.sqrt(dx ** 2 + dy ** 2)

              const shift_pos_x = (lam/dist) * dx + random_dither[l][k].x
              const shift_pos_y = (lam/dist) * dy + random_dither[l][k].y

              move_ar_elem(ar_elements[l][k], draw_points[l][k], shift_pos_x, shift_pos_y);
            }
            else {
              move_ar_elem(ar_elements[l][k], draw_points[l][k], random_dither[l][k].x, random_dither[l][k].y);
            }
        }
    }

    // update_random_dither()

}

window.addEventListener("mousemove", e => {
  svg_mousepos.x = e.clientX - svg.getBoundingClientRect().left;
  svg_mousepos.y = e.clientY - svg.getBoundingClientRect().top;

  if (svg_mousepos.x < 300) {
      mouseover = true;
  }
  else {
      mouseover = false;
  }
});
