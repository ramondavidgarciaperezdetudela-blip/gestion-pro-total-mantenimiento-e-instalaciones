//! HVAC tab of the Tool Sets: walls and the library of refrigeration, air-conditioning,
//! ventilation and electrical equipment of Gestión Pro Total. Every button types a command
//! (a LISP routine from the support folder) on the command line.

use egui::{Sense, vec2};

use crate::theme::Tokens;

/// `category \t command \t name \t width \t height`, generated from the Gestión Pro Total catalog.
const EQUIPOS: &str = include_str!("hvac/equipos.tsv");

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
        if abierto && ui.add_sized([ui.available_width() - 12.0, 22.0], egui::Button::new(nombre)).on_hover_text(medidas).clicked() {
            run = Some(cmd.to_string());
        }
    }
    (run, toggled)
}
