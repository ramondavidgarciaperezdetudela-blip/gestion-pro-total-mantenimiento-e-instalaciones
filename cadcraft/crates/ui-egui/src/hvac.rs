//! HVAC tab of the Tool Sets: walls and the library of refrigeration, air-conditioning,
//! ventilation and electrical equipment of Gestión Pro Total. Every button types a command
//! (a LISP routine from the support folder) on the command line.

use std::collections::HashMap;
use std::sync::OnceLock;

use egui::{Color32, Pos2, Sense, Shape, Stroke, pos2, vec2};

use crate::theme::Tokens;

/// `category \t command \t name \t width \t height`, generated from the Gestión Pro Total catalog.
const EQUIPOS: &str = include_str!("hvac/equipos.tsv");

/// `id \t strokes`: the drawing of each symbol (lines `L`, circles `C`, arcs `A`, polylines `P`) read from
/// the blocks CADCraft makes, used to paint the thumbnail on each button.
const ICONOS: &str = include_str!("hvac/iconos.tsv");

enum Trazo {
    Linea([f32; 4]),
    Circulo([f32; 3]),
    Arco([f32; 5]),
    Poli(bool, Vec<[f32; 2]>),
}

fn iconos() -> &'static HashMap<&'static str, Vec<Trazo>> {
    static MAPA: OnceLock<HashMap<&'static str, Vec<Trazo>>> = OnceLock::new();
    MAPA.get_or_init(|| {
        let mut mapa = HashMap::new();
        for linea in ICONOS.lines() {
            let Some((id, resto)) = linea.split_once('\t') else { continue };
            let mut trazos = Vec::new();
            for t in resto.split(';') {
                let mut campos = t.split(',');
                let Some(tipo) = campos.next() else { continue };
                let nums: Vec<f32> = campos.filter_map(|c| c.parse().ok()).collect();
                match (tipo, nums.len()) {
                    ("L", 4) => trazos.push(Trazo::Linea([nums[0], nums[1], nums[2], nums[3]])),
                    ("C", 3) => trazos.push(Trazo::Circulo([nums[0], nums[1], nums[2]])),
                    ("A", 5) => trazos.push(Trazo::Arco([nums[0], nums[1], nums[2], nums[3], nums[4]])),
                    ("P", n) if n >= 5 => {
                        let cerrada = nums[0] > 0.5;
                        let pts = nums[1..].chunks_exact(2).map(|p| [p[0], p[1]]).collect();
                        trazos.push(Trazo::Poli(cerrada, pts));
                    }
                    _ => {}
                }
            }
            mapa.insert(id, trazos);
        }
        mapa
    })
}

/// Paints a symbol inside `rect`, scaled to fit (CAD's Y axis points up).
fn pintar_icono(painter: &egui::Painter, rect: egui::Rect, trazos: &[Trazo], color: Color32) {
    let (mut x0, mut y0, mut x1, mut y1) = (f32::MAX, f32::MAX, f32::MIN, f32::MIN);
    let mut abarca = |x: f32, y: f32| {
        x0 = x0.min(x);
        y0 = y0.min(y);
        x1 = x1.max(x);
        y1 = y1.max(y);
    };
    for t in trazos {
        match t {
            Trazo::Linea([a, b, c, d]) => {
                abarca(*a, *b);
                abarca(*c, *d);
            }
            Trazo::Circulo([x, y, r]) | Trazo::Arco([x, y, r, _, _]) => {
                abarca(x - r, y - r);
                abarca(x + r, y + r);
            }
            Trazo::Poli(_, pts) => pts.iter().for_each(|p| abarca(p[0], p[1])),
        }
    }
    let (ancho, alto) = ((x1 - x0).max(1e-3), (y1 - y0).max(1e-3));
    let escala = (rect.width() / ancho).min(rect.height() / alto) * 0.92;
    let (cx, cy) = ((x0 + x1) / 2.0, (y0 + y1) / 2.0);
    let a_pantalla = |x: f32, y: f32| pos2(rect.center().x + (x - cx) * escala, rect.center().y - (y - cy) * escala);
    let trazo = Stroke::new(1.0, color);
    for t in trazos {
        match t {
            Trazo::Linea([a, b, c, d]) => {
                painter.line_segment([a_pantalla(*a, *b), a_pantalla(*c, *d)], trazo);
            }
            Trazo::Circulo([x, y, r]) => {
                painter.circle_stroke(a_pantalla(*x, *y), (r * escala).max(0.5), trazo);
            }
            Trazo::Arco([x, y, r, a1, a2]) => {
                let fin = if a2 < a1 { a2 + 360.0 } else { *a2 };
                let pasos = 18;
                let pts: Vec<Pos2> = (0..=pasos)
                    .map(|i| {
                        let ang = (a1 + (fin - a1) * i as f32 / pasos as f32).to_radians();
                        a_pantalla(x + r * ang.cos(), y + r * ang.sin())
                    })
                    .collect();
                painter.add(Shape::line(pts, trazo));
            }
            Trazo::Poli(cerrada, pts) => {
                let mut v: Vec<Pos2> = pts.iter().map(|p| a_pantalla(p[0], p[1])).collect();
                if *cerrada && let Some(p) = v.first().copied() {
                    v.push(p);
                }
                painter.add(Shape::line(v, trazo));
            }
        }
    }
}

/// Wall tools: (command, label, tip).
const PAREDES: &[(&str, &str, &str)] = &[
    ("PARED", "Dibujar pared", "Pide material, grosor y alto, y muestra la medida de cada tramo"),
    ("PAREDEDIT", "Editar pared", "Cambia largo, grosor, alto y material de una pared"),
];

fn header(ui: &mut egui::Ui, title: &str, collapsed: bool) -> egui::Response {
    let t = Tokens::get();
    let (hr, resp) = ui.allocate_exact_size(vec2(ui.available_width(), 24.0), Sense::click());
    let arrow = if collapsed { "▸" } else { "▾" };
    ui.painter().text(
        egui::pos2(hr.left() + 8.0, hr.center().y),
        egui::Align2::LEFT_CENTER,
        format!("{arrow} {title}"),
        egui::FontId::proportional(13.0),
        t.text,
    );
    resp
}

/// A button with the symbol's thumbnail on the left and its name on the right.
fn boton_equipo(ui: &mut egui::Ui, cmd: &str, nombre: &str, medidas: &str) -> egui::Response {
    let t = Tokens::get();
    let (rect, resp) = ui.allocate_exact_size(vec2(ui.available_width() - 12.0, 38.0), Sense::click());
    let resp = resp.on_hover_text(medidas);
    if ui.is_rect_visible(rect) {
        let painter = ui.painter();
        if resp.hovered() {
            painter.rect_filled(rect, 4.0, ui.visuals().widgets.hovered.bg_fill);
        } else {
            painter.rect_filled(rect, 4.0, ui.visuals().widgets.inactive.bg_fill);
        }
        let caja = egui::Rect::from_min_size(rect.left_top() + vec2(4.0, 3.0), vec2(44.0, rect.height() - 6.0));
        if let Some(trazos) = iconos().get(cmd) {
            pintar_icono(painter, caja, trazos, t.text);
        }
        let galley = painter.layout(nombre.to_string(), egui::FontId::proportional(12.5), t.text, (rect.width() - 60.0).max(40.0));
        painter.galley(pos2(rect.left() + 54.0, rect.center().y - galley.size().y / 2.0), galley, t.text);
    }
    resp.on_hover_cursor(egui::CursorIcon::PointingHand)
}

/// Draws the HVAC tab. Returns the command line text to run when a button was pressed, and the
/// group whose header was clicked.
pub fn panel(ui: &mut egui::Ui, collapsed_groups: &[String]) -> (Option<String>, Option<String>) {
    let mut run: Option<String> = None;
    let mut toggled: Option<String> = None;
    let is_collapsed = |g: &str| collapsed_groups.iter().any(|x| x == g);

    ui.add_space(4.0);
    if header(ui, "Paredes", is_collapsed("Paredes")).clicked() {
        toggled = Some("Paredes".into());
    }
    if !is_collapsed("Paredes") {
        for (cmd, label, tip) in PAREDES {
            if ui.add_sized([ui.available_width() - 12.0, 24.0], egui::Button::new(*label)).on_hover_text(*tip).clicked() {
                run = Some((*cmd).to_string());
            }
        }
    }

    let mut grupo = "";
    let mut abierto = true;
    for linea in EQUIPOS.lines() {
        let mut c = linea.split('\t');
        let (Some(cat), Some(cmd), Some(nombre)) = (c.next(), c.next(), c.next()) else { continue };
        let medidas = match (c.next(), c.next()) {
            (Some(w), Some(h)) => format!("{w} × {h} m"),
            _ => String::new(),
        };
        if cat != grupo {
            grupo = cat;
            abierto = !is_collapsed(cat);
            ui.add_space(4.0);
            if header(ui, cat, !abierto).clicked() {
                toggled = Some(cat.to_string());
            }
        }
        if abierto && boton_equipo(ui, cmd, nombre, &medidas).clicked() {
            run = Some(cmd.to_string());
        }
    }
    (run, toggled)
}
