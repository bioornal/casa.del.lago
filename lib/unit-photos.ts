import type { UnitSlug } from "@/lib/units";

// Datos de las galerías de las cabañas. Viven acá (y no en UnitDetail) porque
// también los usan el sitemap y el JSON-LD, que no pueden importar componentes.

// Galerías editoriales — todas las fotos reales del alojamiento en una
// cuadrícula asimétrica. `span` marca el tamaño: hero 2x2, wide 2x1, tall 1x2.
export type GalleryPhoto = { photo: string; alt: string; span?: "hero" | "wide" | "tall" };

// Las cajas de la grilla, medidas en desktop: hero 2×2 576×436 (1.32), wide 2×1
// 576×210 (2.74), tall 1×2 280×436 (0.64) y la celda simple 280×210 (1.33) —
// que, igual que en la galería del home, NO es cuadrada sino apaisada. El set de
// cada cabaña es casi todo vertical, así que las pocas apaisadas se reservan
// para hero/wide/celda simple y el resto va a `tall`, donde el recorte es mínimo.
//
// El orden cuenta la cabaña: se entra por el estar, se recorren los dormitorios
// y el baño, después la cocina y el fuego, y se sale al deck, la pileta y el lago.

// Nombre visible Aguaribay — slug interno aratiri, carpeta "cab arriba" (22 fotos).
const ARATIRI_PHOTOS: GalleryPhoto[] = [
  { photo: "cab arriba/3.jpeg", alt: "Living comedor con mesa de madera maciza y ventanal al deck", span: "hero" },
  { photo: "cab arriba/13.jpeg", alt: "La cabaña desde afuera, con el deck bajo los sauces" },
  { photo: "cab arriba/1.jpeg", alt: "Living con sofá y el comedor al fondo", span: "tall" },
  { photo: "cab arriba/5.jpeg", alt: "El comedor con los ventanales abiertos al lago", span: "wide" },
  { photo: "cab arriba/8.jpeg", alt: "Dormitorio principal con dos mesas de luz", span: "tall" },
  { photo: "cab arriba/9.jpeg", alt: "Segundo dormitorio con cabecera de madera", span: "tall" },
  { photo: "cab arriba/4.jpeg", alt: "Comedor de mesa redonda con la parrilla al fondo" },
  { photo: "cab arriba/2.jpeg", alt: "Cocina con mesada de granito negro", span: "tall" },
  { photo: "cab arriba/16.jpeg", alt: "La parrilla de ladrillo con barra y banquetas", span: "tall" },
  { photo: "cab arriba/17.jpeg", alt: "La parrilla encendida y las verduras sobre la mesada", span: "tall" },
  { photo: "cab arriba/22.jpeg", alt: "El disco al fuego bajo el cartel de la parrilla", span: "tall" },
  { photo: "cab arriba/14.jpeg", alt: "La galería con la salamandra y la pileta mirando al lago", span: "tall" },
  { photo: "cab arriba/15.jpeg", alt: "La salamandra encendida, el mate y el termo sobre la mesa", span: "tall" },
  { photo: "cab arriba/6.jpeg", alt: "Living con Smart TV y sofá con almohadones" },
  { photo: "cab arriba/7.jpeg", alt: "Hall de entrada con banco de madera" },
  { photo: "cab arriba/10.jpeg", alt: "La ventana que da a la pileta y al lago", span: "tall" },
  { photo: "cab arriba/11.jpeg", alt: "El deck con sillones frente a la pileta", span: "tall" },
  { photo: "cab arriba/12.jpeg", alt: "Mesa y sillas bajo los árboles, con el lago detrás", span: "tall" },
  { photo: "cab arriba/19.jpeg", alt: "La pileta y la cabaña en un día abierto", span: "tall" },
  { photo: "cab arriba/20.jpeg", alt: "La pileta vista desde el borde", span: "tall" },
  { photo: "cab arriba/18.jpeg", alt: "Un ananá en la mano, la pileta y el lago de fondo", span: "tall" },
  { photo: "cab arriba/21.jpeg", alt: "El kayak apoyado junto al árbol", span: "tall" },
];

// Nombre visible Aratirí — slug interno aguaribay, carpeta "cab abajo" (26 fotos: 1-21 y 23-27).
const AGUARIBAY_PHOTOS: GalleryPhoto[] = [
  { photo: "cab abajo/11.jpeg", alt: "Living con sofá grande y ventanales al lago", span: "hero" },
  { photo: "cab abajo/27.jpeg", alt: "La pileta turquesa con la cabaña entre los árboles", span: "tall" },
  { photo: "cab abajo/10.jpeg", alt: "El living con la ventana al lago" },
  { photo: "cab abajo/12.jpeg", alt: "Dormitorio principal con cabecera gris", span: "tall" },
  { photo: "cab abajo/14.jpeg", alt: "Segundo dormitorio con ventanal al lago", span: "tall" },
  { photo: "cab abajo/5.jpeg", alt: "El atardecer desde el deck, bajo el árbol grande", span: "wide" },
  { photo: "cab abajo/13.jpeg", alt: "El dormitorio principal desde la puerta", span: "tall" },
  { photo: "cab abajo/9.jpeg", alt: "Baño con ducha de mampara y paredes de cemento alisado", span: "tall" },
  { photo: "cab abajo/1.jpeg", alt: "La cocina del quincho con el horno de ladrillo" },
  { photo: "cab abajo/2.jpeg", alt: "La barra de la cocina y la parrilla" },
  { photo: "cab abajo/16.jpeg", alt: "El quincho: la mesa larga frente al lago", span: "tall" },
  { photo: "cab abajo/24.jpeg", alt: "La mesa del quincho con el termo y el mate", span: "tall" },
  { photo: "cab abajo/3.jpeg", alt: "La tabla de asado sobre la mesa, con el lago detrás" },
  { photo: "cab abajo/21.jpeg", alt: "Las verduras cortadas y el fuego a leña", span: "tall" },
  { photo: "cab abajo/15.jpeg", alt: "La parrilla exterior de ladrillo", span: "tall" },
  { photo: "cab abajo/17.jpeg", alt: "La galería con la taza sobre la mesa y el deck al frente", span: "tall" },
  { photo: "cab abajo/20.jpeg", alt: "Los copetes naranjas del deck, con el lago al fondo" },
  { photo: "cab abajo/19.jpeg", alt: "La noche, con las guirnaldas encendidas sobre la pileta", span: "tall" },
  { photo: "cab abajo/18.jpeg", alt: "La pileta turquesa vista desde el jardín", span: "tall" },
  { photo: "cab abajo/4.jpeg", alt: "La pileta a la sombra de los árboles grandes", span: "tall" },
  { photo: "cab abajo/7.png", alt: "El lago desde el jardín, con la pileta a un costado", span: "tall" },
  { photo: "cab abajo/6.jpeg", alt: "Mesa y sillas bajo el árbol, frente al agua", span: "tall" },
  { photo: "cab abajo/25.jpeg", alt: "El kayak apoyado sobre las raíces" },
  { photo: "cab abajo/26.jpeg", alt: "La costa, la vegetación en primer plano y el lago", span: "tall" },
  { photo: "cab abajo/23.jpeg", alt: "El estar, con el sofá y las ventanas al lago", span: "tall" },
  { photo: "cab abajo/8.jpeg", alt: "Living con Smart TV y mesa ratona", span: "tall" },
];

export const UNIT_GALLERY: Partial<Record<UnitSlug, GalleryPhoto[]>> = {
  aratiri: ARATIRI_PHOTOS,
  aguaribay: AGUARIBAY_PHOTOS,
};

/** Fotos de la galería de una cabaña (ruta en el bucket + alt), para el JSON-LD y el sitemap. */
export function unitGalleryPhotos(slug: UnitSlug): Array<{ photo: string; alt: string }> {
  return (UNIT_GALLERY[slug] ?? []).map(({ photo, alt }) => ({ photo, alt }));
}
