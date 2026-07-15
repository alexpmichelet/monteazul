import type { CommerceCategory } from "@packages/shared/categories";
import { internalMutation } from "./_generated/server";
import { assertValidCommerce, commerceSearchText } from "./lib/commerce";
import type { Estado, ResidesValue } from "./lib/commerce";
import type { Horario } from "./lib/horario";

/**
 * Development seed — replayable mock data for the annuaire.
 *
 * Creates ~15 fully INVENTED Commerces (no real Notion data, ever) covering all
 * nine categories, all seven Comida y bebida sub-categories, the three estados
 * and both horario modes, each attached to a fictional Entrepreneur account.
 *
 * All owner emails use the reserved `@example.com` domain and NO email is sent.
 * The real Notion export is only used at recette time by the operator (see
 * docs/product/notion-csv-format.md) — never here.
 *
 * Idempotent: a re-run deletes exactly the accounts it owns (looked up by their
 * known seed emails) and their Commerces, then recreates everything, so it can
 * be replayed safely with `npx convex run seed:seedDev`.
 */

type SeedCommerce = {
  email: string;
  contactName: string;
  name: string;
  category: CommerceCategory;
  subcategories?: string[];
  description: string;
  whatsapp: string;
  horario: Horario;
  instagram: string;
  resides: ResidesValue;
  notas: string;
  estado: Estado;
};

/** Day indices (0 = Sunday … 6 = Saturday) for the Spanish day ranges below. */
const DAY_RANGES: Record<string, number[]> = {
  "Lun – Vie": [1, 2, 3, 4, 5],
  "Lun – Sáb": [1, 2, 3, 4, 5, 6],
  "Lun – Dom": [0, 1, 2, 3, 4, 5, 6],
  "Mar – Dom": [2, 3, 4, 5, 6, 0],
  "Mar – Sáb": [2, 3, 4, 5, 6],
  "Mié – Dom": [3, 4, 5, 6, 0],
};

// Readable seed shorthand: the same window on every day of a Spanish range.
const semanal = (days: string, from: number, to: number): Horario => ({
  mode: "semanal",
  windows: (DAY_RANGES[days] ?? []).map((dayOfWeek) => ({
    dayOfWeek,
    from,
    to,
  })),
});

const disponible = (label: string): Horario => ({ mode: "disponible", label });

const SEED_COMMERCES: SeedCommerce[] = [
  {
    email: "sazon.abuela@example.com",
    contactName: "María López",
    name: "Sazón de la Abuela",
    category: "Comida y bebida",
    subcategories: ["Almuerzos y comida típica"],
    description:
      "Almuerzos caseros y comida típica colombiana, preparados cada día con ingredientes frescos. Menú del día y pedidos para llevar.",
    whatsapp: "3001234567",
    horario: semanal("Lun – Vie", 690, 900),
    instagram: "sazon.abuela",
    resides: "Resido en Monteazul",
    notas: "Acepta transferencia y efectivo. Domicilios dentro de las torres.",
    estado: "publicado",
  },
  {
    email: "eltrigal.pan@example.com",
    contactName: "Jorge Ramírez",
    name: "Panadería El Trigal",
    category: "Comida y bebida",
    subcategories: ["Panadería y repostería"],
    description:
      "Pan artesanal horneado todos los días, repostería fresca y tortas por encargo. Ideal para el desayuno en familia.",
    whatsapp: "3001234501",
    horario: semanal("Lun – Dom", 360, 1200),
    instagram: "eltrigal.pan",
    resides: "Resido cerca de la zona",
    notas: "Tortas por encargo con 2 días de anticipación.",
    estado: "publicado",
  },
  {
    email: "dulce.monte@example.com",
    contactName: "Laura Gómez",
    name: "Postres Dulce Monte",
    category: "Comida y bebida",
    subcategories: ["Helados y postres"],
    description:
      "Helados artesanales, postres fríos y dulces caseros por porción o para eventos. Sabores rotativos cada semana.",
    whatsapp: "3001234502",
    horario: semanal("Mar – Dom", 780, 1260),
    instagram: "dulce.monte",
    resides: "Resido en Monteazul",
    notas: "Suspendido temporalmente por vacaciones del propietario.",
    estado: "suspendido",
  },
  {
    email: "lacosecha.fruver@example.com",
    contactName: "Pedro Díaz",
    name: "Frutería La Cosecha",
    category: "Comida y bebida",
    subcategories: ["Frutas y mercado"],
    description:
      "Frutas, verduras y productos de mercado seleccionados a diario. Combos de fruver y entregas a domicilio.",
    whatsapp: "3001234503",
    horario: semanal("Lun – Sáb", 420, 1140),
    instagram: "lacosecha.fruver",
    resides: "No resido cerca de la zona",
    notas: "Entregas antes de las 9:00 con pedido del día anterior.",
    estado: "publicado",
  },
  {
    email: "carnes.donrey@example.com",
    contactName: "Andrés Torres",
    name: "Carnes Don Rey",
    category: "Comida y bebida",
    subcategories: ["Carnes y embutidos"],
    description:
      "Carnes frescas, embutidos artesanales y cortes especiales por encargo. Calidad garantizada para tu asado.",
    whatsapp: "3001234504",
    horario: disponible("sobre pedido"),
    instagram: "carnes.donrey",
    resides: "Resido cerca de la zona",
    notas: "Pedidos por encargo, entrega en 24 horas.",
    estado: "publicado",
  },
  {
    email: "verde.vida@example.com",
    contactName: "Sofía Herrera",
    name: "Snacks Verde Vida",
    category: "Comida y bebida",
    subcategories: ["Snacks y saludables"],
    description:
      "Snacks saludables, barras energéticas y opciones sin azúcar. Meriendas ligeras para toda la familia.",
    whatsapp: "3001234505",
    horario: semanal("Lun – Vie", 480, 1080),
    instagram: "verde.vida",
    resides: "Resido en Monteazul",
    notas: "Fiche recién enviada, pendiente de aprobación.",
    estado: "pendiente",
  },
  {
    email: "delicias.marta@example.com",
    contactName: "Marta Ruiz",
    name: "Delicias Doña Marta",
    category: "Comida y bebida",
    subcategories: ["Otros"],
    description:
      "Antojos variados, bebidas caseras y preparaciones especiales para reuniones. Pregunta por el menú de la semana.",
    whatsapp: "3001234506",
    horario: semanal("Mié – Dom", 600, 960),
    instagram: "delicias.marta",
    resides: "Resido cerca de la zona",
    notas: "Atiende principalmente fines de semana.",
    estado: "publicado",
  },
  {
    email: "huellitas.pet@example.com",
    contactName: "Camilo Vargas",
    name: "PetShop Huellitas",
    category: "Mascotas",
    description:
      "Tienda para mascotas: alimento, accesorios y servicio de baño y peluquería canina. Asesoría en nutrición.",
    whatsapp: "3001234507",
    horario: semanal("Lun – Dom", 540, 1140),
    instagram: "huellitas.pet",
    resides: "Resido en Monteazul",
    notas: "Baño con cita, venta de alimento sin cita.",
    estado: "publicado",
  },
  {
    email: "aura.belleza@example.com",
    contactName: "Valentina Ríos",
    name: "Belleza Aura",
    category: "Belleza y cuidado personal",
    description:
      "Peluquería y estética integral: corte, color, manicura y tratamientos faciales. Atención con cita para evitar esperas.",
    whatsapp: "3001234508",
    horario: semanal("Mar – Sáb", 540, 1080),
    instagram: "aura.belleza",
    resides: "Resido cerca de la zona",
    notas: "Promociones entre semana.",
    estado: "publicado",
  },
  {
    email: "fisio.bienestar@example.com",
    contactName: "Daniel Castro",
    name: "Fisio Bienestar",
    category: "Salud y bienestar",
    description:
      "Fisioterapia y rehabilitación a domicilio o en consultorio. Valoración inicial y planes personalizados.",
    whatsapp: "3001234509",
    horario: disponible("con cita previa"),
    instagram: "fisio.bienestar",
    resides: "No resido cerca de la zona",
    notas: "Atención con cita previa, incluye visitas a domicilio.",
    estado: "publicado",
  },
  {
    email: "moda.andina@example.com",
    contactName: "Isabela Moreno",
    name: "Moda Andina",
    category: "Accesorios y ropa",
    description:
      "Ropa y accesorios de diseño local para mujer y hombre. Nuevas colecciones cada temporada y arreglos a la medida.",
    whatsapp: "3001234510",
    horario: semanal("Lun – Sáb", 600, 1140),
    instagram: "moda.andina",
    resides: "Resido en Monteazul",
    notas: "Arreglos a la medida con costo adicional.",
    estado: "publicado",
  },
  {
    email: "tejidos.monteazul@example.com",
    contactName: "Rosa Beltrán",
    name: "Tejidos Monteazul",
    category: "Hogar y artesanías",
    description:
      "Tejidos y artesanías hechas a mano: mantas, bolsos y piezas decorativas. Trabajos personalizados sobre pedido.",
    whatsapp: "3001234511",
    horario: disponible("sobre pedido"),
    instagram: "tejidos.monteazul",
    resides: "Resido cerca de la zona",
    notas: "Tiempos de entrega según el trabajo.",
    estado: "publicado",
  },
  {
    email: "tecnofix.mz@example.com",
    contactName: "Felipe Nieto",
    name: "TecnoFix MZ",
    category: "Tecnología",
    description:
      "Reparación de celulares, computadores y accesorios tecnológicos. Diagnóstico rápido y repuestos con garantía.",
    whatsapp: "3001234512",
    horario: semanal("Lun – Sáb", 540, 1080),
    instagram: "tecnofix.mz",
    resides: "Resido en Monteazul",
    notas: "Garantía de 30 días en reparaciones.",
    estado: "publicado",
  },
  {
    email: "servicios.hogar@example.com",
    contactName: "Gloria Peña",
    name: "Servicios Hogar Monteazul",
    category: "Inmuebles y servicios",
    description:
      "Servicios para el hogar: mantenimiento, plomería, electricidad y asesoría inmobiliaria dentro de la comunidad.",
    whatsapp: "3001234513",
    horario: disponible("con cita previa"),
    instagram: "servicios.hogar.mz",
    resides: "No resido cerca de la zona",
    notas: "Cotizaciones sin costo, con cita previa.",
    estado: "publicado",
  },
  {
    email: "trueques.barrio@example.com",
    contactName: "Óscar Salazar",
    name: "Trueques del Barrio",
    category: "Otro",
    description:
      "Espacio de trueque e intercambio de objetos entre vecinos. Publica lo que ya no usas y encuentra lo que necesitas.",
    whatsapp: "3001234514",
    horario: semanal("Lun – Vie", 600, 1020),
    instagram: "trueques.barrio",
    resides: "Resido en Monteazul",
    notas: "Iniciativa comunitaria, pendiente de revisión.",
    estado: "pendiente",
  },
];

export const seedDev = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Remove any prior run: delete exactly the seed's own accounts (by email)
    // and their Commerces, so the seed is replayable without duplicating data.
    for (const seed of SEED_COMMERCES) {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", seed.email))
        .first();
      if (!existing) continue;
      const owned = await ctx.db
        .query("commerces")
        .withIndex("by_owner", (q) => q.eq("ownerId", existing._id))
        .collect();
      for (const commerce of owned) {
        await ctx.db.delete(commerce._id);
      }
      await ctx.db.delete(existing._id);
    }

    let count = 0;
    for (const seed of SEED_COMMERCES) {
      assertValidCommerce({
        category: seed.category,
        subcategories: seed.subcategories,
        whatsapp: seed.whatsapp,
      });

      const ownerId = await ctx.db.insert("users", {
        email: seed.email,
        name: seed.contactName,
        role: "entreprise",
      });

      await ctx.db.insert("commerces", {
        name: seed.name,
        category: seed.category,
        subcategories: seed.subcategories,
        description: seed.description,
        searchText: commerceSearchText({
          name: seed.name,
          category: seed.category,
          subcategories: seed.subcategories,
          description: seed.description,
        }),
        whatsapp: seed.whatsapp,
        photos: [],
        horario: seed.horario,
        instagram: seed.instagram,
        contactName: seed.contactName,
        resides: seed.resides,
        notas: seed.notas,
        estado: seed.estado,
        ownerId,
      });
      count += 1;
    }

    return { count };
  },
});
