//! LISP routines of Gestión Pro Total (walls, symbols, equipment library), embedded in the page.
//! The files in `hvac_lsp/` are copied from `cadcraft-hvac/support` when the page is built.

pub const SOURCES: &[(&str, &str)] = &[
    ("hvac-paredes.lsp", include_str!("hvac_lsp/hvac-paredes.lsp")),
    ("hvac-simbolos.lsp", include_str!("hvac_lsp/hvac-simbolos.lsp")),
    ("hvac-biblioteca.lsp", include_str!("hvac_lsp/hvac-biblioteca.lsp")),
];
