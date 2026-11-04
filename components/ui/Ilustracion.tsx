import Image from "next/image";
import { bucketSrc } from "@/components/ui/ImageSlot";
import { Parallax } from "@/components/motion/Parallax";

/**
 * Ilustración decorativa sobre papel claro (tinta sepia + acuarela, generadas
 * con IA para el sitio; carpeta secciones/ del bucket).
 *
 * El papel de cada dibujo es un poco más cálido que el fondo de su sección. Se
 * mezcla con `darken` (por canal se queda el más oscuro de los dos) y se
 * aclara con brightness() hasta que el papel quede MÁS CLARO que el fondo en
 * los tres canales: así el papel desaparece del todo —sin rectángulo ni tinte
 * amarillo— y quedan sólo los trazos. Con multiply eso no pasa: un papel
 * amarillento tiñe el fondo. `aclarar` = máx(fondo/papel por canal) + ~3%.
 *
 * Regla de la casa: una ilustración NUNCA va detrás de un texto. Como fondo,
 * ubicarla en un hueco sin texto; si no hay, como viñeta en su propio lugar
 * (`enFlujo`). La sección que la usa de fondo tiene que ser `isolate` (va en
 * -z-10, detrás del contenido).
 */
const ilustracion = (path: string, ancho: number, alto: number) =>
  ({ src: bucketSrc(path), ancho, alto }) as const;

// Lámina botánica (pindó, helecho, yerba). Va SÓLO en Cabañas. Papel 229,224,211.
// Ojo: en el bucket quedó con el nombre cruzado — el archivo de las HOJAS es
// "lagoAnochecer.jpg" (y el lago al anochecer es "GraficosHojas.jpg").
export const LAMINA_BOTANICA = ilustracion("secciones/lagoAnochecer.jpg", 928, 1152);
// Kayak, juncos y garza (Postales del lago, sobre arena). Papel 239,232,214.
export const ILUSTRACION_KAYAK = ilustracion("secciones/lago.jpg", 1200, 896);
// Mate y termo sobre una tabla (Opiniones, sobre arena clara). Papel 229,220,199.
export const ILUSTRACION_MATE = ilustracion("secciones/mate.jpg", 1024, 1024);
// Llave, brújula y mapa del lago (Preguntas frecuentes, sobre marfil). Papel 234,225,204.
export const ILUSTRACION_PREGUNTAS = ilustracion("secciones/preguntas.jpg", 928, 1152);

// Funde los cuatro bordes (dos degradés que se intersecan): red de seguridad
// por si algún borde del papel no llega a desaparecer.
const MASCARA =
  "[mask-composite:intersect] [mask-image:linear-gradient(90deg,transparent_0%,#000_12%,#000_88%,transparent_100%),linear-gradient(180deg,transparent_0%,#000_10%,#000_90%,transparent_100%)]";

export function Ilustracion({
  src,
  ancho,
  alto,
  encuadre,
  aclarar = 1,
  espejo = false,
  enFlujo = false,
  parallax,
  sizes,
  className = "",
}: {
  src: string;
  /** Tamaño del archivo en px: define la proporción de la caja. */
  ancho: number;
  alto: number;
  /**
   * Recorte opcional: otra proporción para la caja (más baja que el archivo,
   * p. ej.) y qué parte del dibujo queda (object-position). Sirve para que la
   * ilustración ocupe sólo un hueco sin texto.
   */
  encuadre?: { proporcion: string; posicion: string };
  /** brightness() para llevar el papel por encima del tono del fondo (1 = sin tocar). */
  aclarar?: number;
  /** Da vuelta el dibujo en horizontal. */
  espejo?: boolean;
  /**
   * false (default): absoluta y detrás del contenido (-z-10), como fondo.
   * true: ocupa su lugar en la columna, como una viñeta debajo del texto.
   */
  enFlujo?: boolean;
  /** Recorrido del parallax en px (positivo = más lento que la página). */
  parallax?: number;
  /** Ancho real en pantalla, para que next/image pida el tamaño justo. */
  sizes: string;
  /** Posición y ancho (absolute/relative ya vienen puestos), opacidad, visibilidad. */
  className?: string;
}) {
  const caja = (
    <div
      aria-hidden="true"
      className={`relative ${MASCARA} ${espejo ? "-scale-x-100" : ""}`}
      style={{ aspectRatio: encuadre?.proporcion ?? `${ancho} / ${alto}` }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
        style={{
          objectPosition: encuadre?.posicion,
          filter: aclarar === 1 ? undefined : `brightness(${aclarar})`,
        }}
      />
    </div>
  );
  // mix-blend en el contenedor más externo: el transform del parallax lo vuelve
  // un grupo propio, y un hijo sólo se mezclaría con ese grupo.
  const base = `pointer-events-none ${enFlujo ? "relative" : "absolute -z-10"} mix-blend-darken ${className}`;
  return parallax ? (
    <Parallax speed={parallax} className={base}>
      {caja}
    </Parallax>
  ) : (
    <div className={base}>{caja}</div>
  );
}
