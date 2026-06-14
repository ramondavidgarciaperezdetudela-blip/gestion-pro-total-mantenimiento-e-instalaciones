// ─── Fuentes del sistema Windows (predeterminadas en Windows 10/11) ───────────
export const WINDOWS_FONTS = [
  // Sans-serif del sistema
  'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Candara', 'Century Gothic',
  'Corbel', 'Franklin Gothic Medium', 'Gill Sans MT', 'Impact', 'Lucida Sans Unicode',
  'Microsoft Sans Serif', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold',
  'Tahoma', 'Trebuchet MS', 'Verdana',
  // Serif del sistema
  'Book Antiqua', 'Cambria', 'Constantia', 'Garamond', 'Georgia',
  'Palatino Linotype', 'Times New Roman',
  // Monoespaciadas
  'Consolas', 'Courier New', 'Lucida Console', 'Lucida Typewriter',
  // Caligráficas
  'Comic Sans MS', 'Freestyle Script', 'Lucida Calligraphy', 'Lucida Handwriting',
  'Mistral', 'Segoe Print', 'Segoe Script',
  // Decorativas y Display
  'Agency FB', 'Algerian', 'Arial Rounded MT Bold', 'Bauhaus 93', 'Berlin Sans FB',
  'Blackadder ITC', 'Bodoni MT', 'Broadway', 'Californian FB', 'Calisto MT',
  'Castellar', 'Centaur', 'Chiller', 'Colonna MT', 'Cooper Black',
  'Curlz MT', 'Edwardian Script ITC', 'Elephant', 'Engravers MT', 'Eras Bold ITC',
  'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC', 'Felix Titling',
  'Footlight MT Light', 'Forte', 'Franklin Gothic Book', 'Franklin Gothic Demi',
  'Franklin Gothic Heavy', 'Gigi', 'Goudy Old Style', 'Goudy Stout', 'Haettenschweiler',
  'Harlow Solid Italic', 'Harrington', 'High Tower Text', 'Imprint MT Shadow',
  'Informal Roman', 'Jokerman', 'Juice ITC', 'Kristen ITC', 'Kunstler Script',
  'Leelawadee', 'Leelawadee UI', 'Magneto', 'Maiandra GD', 'Matura MT Script Capitals',
  'Meiryo', 'Meiryo UI', 'Niagara Engraved', 'Niagara Solid', 'OCR A Extended',
  'Old English Text MT', 'Onyx', 'Papyrus', 'Parchment', 'Perpetua', 'Perpetua Titling MT',
  'Playbill', 'Poor Richard', 'Pristina', 'Rage Italic', 'Ravie', 'Rockwell',
  'Rockwell Condensed', 'Rockwell Extra Bold', 'Script MT Bold', 'Showcard Gothic',
  'Snap ITC', 'Stencil', 'Tw Cen MT', 'Viner Hand ITC', 'Vivaldi', 'Vladimir Script',
  'Wide Latin',
  // Fuentes de idiomas adicionales
  'Arial Unicode MS', 'MS Gothic', 'MS Mincho', 'MS PGothic', 'MS PMincho',
  'MingLiU', 'SimHei', 'SimSun', 'NSimSun', 'Yu Gothic', 'Yu Mincho',
  'Gulim', 'Dotum', 'Batang', 'Malgun Gothic', 'Gungsuh',
  // Fuentes de símbolos
  'Symbol', 'Wingdings', 'Wingdings 2', 'Wingdings 3', 'Webdings',
  'Segoe UI Symbol', 'Segoe UI Emoji', 'Segoe MDL2 Assets',
];

// ─── Google Fonts seleccionadas (se cargan dinámicamente) ─────────────────────
export const GOOGLE_FONTS = [
  // Sans-serif modernas
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans 3',
  'Nunito', 'Quicksand', 'Raleway', 'Josefin Sans', 'DM Sans', 'Space Grotesk',
  'Plus Jakarta Sans', 'Figtree', 'Inter', 'Outfit',
  // Condensadas y display
  'Oswald', 'Bebas Neue', 'Roboto Condensed', 'Anton', 'Barlow Condensed',
  'Fjalla One', 'Righteous', 'Squada One', 'Teko', 'Russo One',
  // Serif elegantes
  'Playfair Display', 'Merriweather', 'Libre Baskerville', 'EB Garamond',
  'Cormorant Garamond', 'Lora', 'PT Serif', 'Domine', 'Bitter', 'Crete Round',
  // Caligráficas / Handwriting
  'Dancing Script', 'Pacifico', 'Lobster', 'Caveat', 'Sacramento',
  'Great Vibes', 'Satisfy', 'Cookie', 'Allura', 'Kaushan Script',
  // Monoespaciadas
  'Roboto Mono', 'Source Code Pro', 'Fira Code', 'JetBrains Mono', 'Space Mono',
];

// Todas las fuentes juntas con metadatos
export const ALL_FONTS = [
  ...WINDOWS_FONTS.map(f => ({ name: f, type: 'system', label: f })),
  ...GOOGLE_FONTS.map(f => ({ name: f, type: 'google', label: f + ' (Google)' })),
];

// Grupos para el selector
export const FONT_GROUPS = {
  'Sistema — Sans-serif': WINDOWS_FONTS.filter(f =>
    ['Arial','Calibri','Candara','Corbel','Franklin Gothic Medium','Gill Sans MT','Impact',
     'Segoe UI','Segoe UI Light','Tahoma','Trebuchet MS','Verdana','Microsoft Sans Serif',
     'Century Gothic','Lucida Sans Unicode','Arial Black','Arial Narrow'].includes(f)
  ),
  'Sistema — Serif': WINDOWS_FONTS.filter(f =>
    ['Book Antiqua','Cambria','Constantia','Garamond','Georgia','Palatino Linotype','Times New Roman'].includes(f)
  ),
  'Sistema — Monoespaciadas': WINDOWS_FONTS.filter(f =>
    ['Consolas','Courier New','Lucida Console'].includes(f)
  ),
  'Sistema — Caligráficas': WINDOWS_FONTS.filter(f =>
    ['Comic Sans MS','Lucida Calligraphy','Lucida Handwriting','Segoe Print','Segoe Script','Vivaldi','Pristina'].includes(f)
  ),
  'Sistema — Display / Decorativas': WINDOWS_FONTS.filter(f =>
    ['Agency FB','Algerian','Broadway','Cooper Black','Impact','Rockwell','Stencil','Papyrus','Old English Text MT'].includes(f)
  ),
  'Sistema — Símbolos': WINDOWS_FONTS.filter(f =>
    ['Symbol','Wingdings','Wingdings 2','Wingdings 3','Webdings','Segoe UI Symbol','Segoe UI Emoji'].includes(f)
  ),
  'Google — Sans-serif': ['Roboto','Open Sans','Lato','Montserrat','Poppins','Source Sans 3','Nunito','Quicksand','Raleway','Josefin Sans','DM Sans','Space Grotesk','Plus Jakarta Sans','Figtree','Inter','Outfit'],
  'Google — Condensadas': ['Oswald','Bebas Neue','Roboto Condensed','Anton','Barlow Condensed','Fjalla One','Righteous','Squada One','Teko','Russo One'],
  'Google — Serif': ['Playfair Display','Merriweather','Libre Baskerville','EB Garamond','Cormorant Garamond','Lora','PT Serif','Domine','Bitter'],
  'Google — Caligráficas': ['Dancing Script','Pacifico','Lobster','Caveat','Sacramento','Great Vibes','Satisfy','Cookie','Allura','Kaushan Script'],
  'Google — Monoespaciadas': ['Roboto Mono','Source Code Pro','Fira Code','JetBrains Mono','Space Mono'],
};

// Cargar una Google Font dinámicamente
export function loadGoogleFont(fontName) {
  if (!fontName) return;
  const id = 'gf-' + fontName.replace(/\s/g, '-').toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

