// lib/firestore.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  setDoc,
  getDoc,
  serverTimestamp,
  where,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

/* Utilidad interna para fechas */
function parseFirestoreDate(value: any): Date | null {
  if (!value) return null;
  try {
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate();
  } catch {
    // ignore
  }
  return null;
}

function dateMs(d: Date | null | undefined): number {
  return d instanceof Date ? d.getTime() : 0;
}

/**
 * Firestore NO acepta undefined.
 * Limpia keys con undefined.
 */
function cleanForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** util: chunk para queries "in" (Firestore limita a 30 valores) */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ============================
   TIPOS BÁSICOS
   ============================ */

export type Categoria = {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
};

export type Plato = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  categoriaNombre?: string;
  tieneImagen: boolean;
  imagenURL?: string | null;
  activo: boolean;
  orden: number;
};

export type PlatoDelDiaConfig = {
  modo: "automatico" | "manual";
  platoId?: string;
  tituloManual?: string;
  descripcionManual?: string;
  precioManual?: number;
  imagenManual?: string | null;
  activo: boolean;
};

export type MenuBlockTipo = "plato" | "manual";

export type MenuBlock = {
  id: string;
  activo: boolean;
  orden: number;
  tipo: MenuBlockTipo;

  titulo: string;

  descripcion?: string;
  precioManual?: number;
  imagenURL?: string | null;

  platoId?: string;

  creadoEn?: Date | null;
};

export type PedidoEstadoMesa = "abierto" | "cerrado";

export type Pedido = {
  id: string;
  mesaCodigo: string;
  mesaNombre?: string;
  estadoMesa: PedidoEstadoMesa;
  creadoEn: Date | null;
  cerradoEn?: Date | null;
  total: number;
  llamoMozo: boolean;
  pidioCuenta: boolean;
};

export type PedidoItemEstado = "pendiente" | "en_preparacion" | "listo" | "entregado";

export type PedidoItem = {
  id: string;
  pedidoId: string;
  mesaCodigo: string;
  mesaNombre?: string;
  tipo: "menu" | "manual";
  platoId?: string;
  nombre: string;
  nota?: string;
  precioUnitario: number;
  cantidad: number;
  estado: PedidoItemEstado;
  creadoEn: Date | null;
};

/* ============================
   COLECCIONES
   ============================ */

const CATEGORIAS_COL = "categorias";
const PLATOS_COL = "platos";
const CONFIG_COL = "config";
const DOC_PLATO_DEL_DIA = "platoDelDia";

const PEDIDOS_COL = "pedidos";
const PEDIDO_ITEMS_COL = "pedidoItems";
const MENU_BLOCKS_COL = "menuBlocks";

/* ============================
   CATEGORÍAS
   ============================ */

export async function getCategorias(): Promise<Categoria[]> {
  const ref = collection(db, CATEGORIAS_COL);
  const snap = await getDocs(ref);

  const cats = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      nombre: data.nombre ?? "",
      orden: typeof data.orden === "number" ? data.orden : 9999,
      activa: data.activa ?? true,
    } satisfies Categoria;
  });

  cats.sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
  return cats;
}

export async function createCategoria(nombre: string): Promise<void> {
  const existentes = await getCategorias();
  const nuevoOrden =
    existentes.length === 0 ? 1 : Math.max(...existentes.map((c) => c.orden || 0)) + 1;

  await addDoc(collection(db, CATEGORIAS_COL), {
    nombre,
    orden: nuevoOrden,
    activa: true,
  });
}

export async function updateCategoria(id: string, data: Partial<Omit<Categoria, "id">>) {
  const ref = doc(db, CATEGORIAS_COL, id);
  await updateDoc(ref, cleanForFirestore(data as any) as any);
}

export async function deleteCategoria(id: string) {
  const ref = doc(db, CATEGORIAS_COL, id);
  await deleteDoc(ref);
}

/* ============================
   PLATOS
   ============================ */

export async function getPlatos(): Promise<Plato[]> {
  const ref = collection(db, PLATOS_COL);
  const snap = await getDocs(ref);

  const platos: Plato[] = snap.docs.map((d) => {
    const data = d.data() as Partial<Plato>;
    return {
      id: d.id,
      nombre: data.nombre ?? "",
      descripcion: data.descripcion ?? "",
      precio: data.precio ?? 0,
      categoriaId: data.categoriaId ?? "",
      categoriaNombre: data.categoriaNombre,
      tieneImagen: !!data.tieneImagen,
      imagenURL: data.imagenURL ?? null,
      activo: data.activo ?? true,
      orden: typeof data.orden === "number" ? data.orden : 9999,
    };
  });

  platos.sort((a, b) => {
    const catA = a.categoriaId || "";
    const catB = b.categoriaId || "";
    if (catA === catB) return (a.orden ?? 9999) - (b.orden ?? 9999);
    return catA.localeCompare(catB);
  });

  return platos;
}

export async function createPlato(plato: Omit<Plato, "id">) {
  await addDoc(collection(db, PLATOS_COL), cleanForFirestore(plato as any) as any);
}

export async function updatePlato(id: string, data: Partial<Omit<Plato, "id">>) {
  const ref = doc(db, PLATOS_COL, id);
  await updateDoc(ref, cleanForFirestore(data as any) as any);
}

export async function deletePlato(id: string) {
  const ref = doc(db, PLATOS_COL, id);
  await deleteDoc(ref);
}

/* ============================
   PLATO DEL DÍA
   ============================ */

export async function getPlatoDelDia(): Promise<PlatoDelDiaConfig | null> {
  const ref = doc(db, CONFIG_COL, DOC_PLATO_DEL_DIA);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PlatoDelDiaConfig;
}

export async function setPlatoDelDia(cfg: PlatoDelDiaConfig) {
  const ref = doc(db, CONFIG_COL, DOC_PLATO_DEL_DIA);
  await setDoc(ref, cleanForFirestore(cfg as any) as any, { merge: true });
}

/* ============================
   BLOQUES ARRIBA DE LA CARTA
   ============================ */

export async function getMenuBlocks(): Promise<MenuBlock[]> {
  const ref = collection(db, MENU_BLOCKS_COL);
  const snap = await getDocs(ref);

  const blocks = snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      activo: data.activo ?? true,
      orden: typeof data.orden === "number" ? data.orden : 9999,
      tipo: (data.tipo as MenuBlockTipo) ?? "manual",
      titulo: data.titulo ?? "",
      descripcion: data.descripcion ?? "",
      precioManual: typeof data.precioManual === "number" ? data.precioManual : undefined,
      imagenURL: data.imagenURL ?? null,
      platoId: data.platoId ?? undefined,
      creadoEn: parseFirestoreDate(data.creadoEn),
    } satisfies MenuBlock;
  });

  blocks.sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
  return blocks;
}

export async function createMenuBlock(
  block: Omit<MenuBlock, "id" | "creadoEn" | "orden"> & { orden?: number }
): Promise<void> {
  const existentes = await getMenuBlocks();
  const nuevoOrden =
    existentes.length === 0 ? 1 : Math.max(...existentes.map((b) => b.orden || 0)) + 1;

  const payload = cleanForFirestore({
    ...block,
    orden: typeof block.orden === "number" ? block.orden : nuevoOrden,
    activo: block.activo ?? true,
    creadoEn: serverTimestamp(),
  } as any);

  await addDoc(collection(db, MENU_BLOCKS_COL), payload as any);
}

export async function updateMenuBlock(id: string, data: Partial<Omit<MenuBlock, "id">>): Promise<void> {
  await updateDoc(doc(db, MENU_BLOCKS_COL, id), cleanForFirestore(data as any) as any);
}

export async function deleteMenuBlock(id: string): Promise<void> {
  await deleteDoc(doc(db, MENU_BLOCKS_COL, id));
}

/* ============================
   MESAS / PEDIDOS
   ============================ */

export async function getPedidoActivoPorMesa(mesaCodigo: string): Promise<Pedido | null> {
  if (!mesaCodigo) return null;

  const ref = collection(db, PEDIDOS_COL);
  const q = query(
    ref,
    where("mesaCodigo", "==", mesaCodigo),
    where("estadoMesa", "==", "abierto"),
    limit(5)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const pedidos = snap.docs.map((d) => {
    const data = d.data() as any;
    const creado = parseFirestoreDate(data.creadoEn);
    return {
      id: d.id,
      mesaCodigo: data.mesaCodigo ?? mesaCodigo,
      mesaNombre: data.mesaNombre ?? "",
      estadoMesa: (data.estadoMesa as PedidoEstadoMesa) ?? "abierto",
      creadoEn: creado,
      cerradoEn: parseFirestoreDate(data.cerradoEn),
      total: typeof data.total === "number" ? data.total : 0,
      llamoMozo: !!data.llamoMozo,
      pidioCuenta: !!data.pidioCuenta,
    } satisfies Pedido;
  });

  pedidos.sort((a, b) => dateMs(b.creadoEn) - dateMs(a.creadoEn));
  return pedidos[0] ?? null;
}

export async function crearPedido(params: { mesaCodigo: string; mesaNombre?: string }): Promise<string> {
  const { mesaCodigo, mesaNombre } = params;

  const existente = await getPedidoActivoPorMesa(mesaCodigo);
  if (existente) return existente.id;

  const ref = await addDoc(collection(db, PEDIDOS_COL), {
    mesaCodigo,
    mesaNombre: mesaNombre ?? "",
    estadoMesa: "abierto",
    creadoEn: serverTimestamp(),
    cerradoEn: null,
    total: 0,
    llamoMozo: false,
    pidioCuenta: false,
  });

  return ref.id;
}

export async function marcarLlamoMozo(mesaCodigo: string): Promise<void> {
  const pedido = await getPedidoActivoPorMesa(mesaCodigo);
  if (!pedido) {
    const id = await crearPedido({ mesaCodigo });
    await updateDoc(doc(db, PEDIDOS_COL, id), { llamoMozo: true });
    return;
  }
  await updateDoc(doc(db, PEDIDOS_COL, pedido.id), { llamoMozo: true });
}

export async function marcarPidioCuenta(mesaCodigo: string): Promise<void> {
  const pedido = await getPedidoActivoPorMesa(mesaCodigo);
  if (!pedido) {
    const id = await crearPedido({ mesaCodigo });
    await updateDoc(doc(db, PEDIDOS_COL, id), { pidioCuenta: true });
    return;
  }
  await updateDoc(doc(db, PEDIDOS_COL, pedido.id), { pidioCuenta: true });
}

export async function limpiarLlamoMozo(pedidoId: string): Promise<void> {
  if (!pedidoId) return;
  await updateDoc(doc(db, PEDIDOS_COL, pedidoId), { llamoMozo: false });
}

export async function limpiarPidioCuenta(pedidoId: string): Promise<void> {
  if (!pedidoId) return;
  await updateDoc(doc(db, PEDIDOS_COL, pedidoId), { pidioCuenta: false });
}

/* ============================
   ÍTEMS DE PEDIDO
   ============================ */

export async function agregarItemAPedido(params: {
  mesaCodigo: string;
  mesaNombre?: string;
  tipo: "menu" | "manual";
  platoId?: string;
  nombre: string;
  nota?: string;
  precioUnitario: number;
  cantidad?: number;
}): Promise<void> {
  const { mesaCodigo, mesaNombre, tipo, platoId, nombre, nota, precioUnitario, cantidad = 1 } = params;

  const pedidoId = await crearPedido({ mesaCodigo, mesaNombre });

  await addDoc(
    collection(db, PEDIDO_ITEMS_COL),
    cleanForFirestore({
      pedidoId,
      mesaCodigo,
      mesaNombre: mesaNombre ?? "",
      tipo,
      platoId: platoId ?? undefined,
      nombre,
      nota: nota ?? "",
      precioUnitario,
      cantidad,
      estado: "pendiente",
      creadoEn: serverTimestamp(),
    } as any) as any
  );
}

export async function getPedidoItemsPorPedido(pedidoId: string): Promise<PedidoItem[]> {
  if (!pedidoId) return [];

  const ref = collection(db, PEDIDO_ITEMS_COL);
  const q = query(ref, where("pedidoId", "==", pedidoId), limit(500));
  const snap = await getDocs(q);

  const items = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      pedidoId: data.pedidoId,
      mesaCodigo: data.mesaCodigo,
      mesaNombre: data.mesaNombre,
      tipo: data.tipo as "menu" | "manual",
      platoId: data.platoId ?? undefined,
      nombre: data.nombre ?? "",
      nota: data.nota ?? "",
      precioUnitario: data.precioUnitario ?? 0,
      cantidad: data.cantidad ?? 1,
      estado: (data.estado as PedidoItemEstado) ?? "pendiente",
      creadoEn: parseFirestoreDate(data.creadoEn),
    } satisfies PedidoItem;
  });

  items.sort((a, b) => dateMs(a.creadoEn) - dateMs(b.creadoEn));
  return items;
}

/**
 * ✅ NUEVO: Trae ítems SOLO para una lista de pedidos (para Cocina).
 * Firestore limita `in` a 30 valores, por eso chunk.
 */
export async function getPedidoItemsPorPedidos(pedidoIds: string[]): Promise<PedidoItem[]> {
  const ids = (pedidoIds || []).filter(Boolean);
  if (ids.length === 0) return [];

  const ref = collection(db, PEDIDO_ITEMS_COL);
  const chunks = chunkArray(ids, 30);

  const snaps = await Promise.all(
    chunks.map((c) => {
      const q = query(ref, where("pedidoId", "in", c), limit(2000));
      return getDocs(q);
    })
  );

  const allDocs = snaps.flatMap((s) => s.docs);

  const items = allDocs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      pedidoId: data.pedidoId,
      mesaCodigo: data.mesaCodigo,
      mesaNombre: data.mesaNombre,
      tipo: data.tipo as "menu" | "manual",
      platoId: data.platoId ?? undefined,
      nombre: data.nombre ?? "",
      nota: data.nota ?? "",
      precioUnitario: data.precioUnitario ?? 0,
      cantidad: data.cantidad ?? 1,
      estado: (data.estado as PedidoItemEstado) ?? "pendiente",
      creadoEn: parseFirestoreDate(data.creadoEn),
    } satisfies PedidoItem;
  });

  items.sort((a, b) => dateMs(a.creadoEn) - dateMs(b.creadoEn));
  return items;
}

export async function updatePedidoItem(itemId: string, data: Partial<Omit<PedidoItem, "id">>): Promise<void> {
  await updateDoc(doc(db, PEDIDO_ITEMS_COL, itemId), cleanForFirestore(data as any) as any);
}

export async function deletePedidoItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, PEDIDO_ITEMS_COL, itemId));
}

export async function cambiarEstadoPedidoItem(itemId: string, nuevoEstado: PedidoItemEstado): Promise<void> {
  await updateDoc(doc(db, PEDIDO_ITEMS_COL, itemId), { estado: nuevoEstado });
}

/** ✅ opcional: no borra, deja trazabilidad */
export async function anularPedidoItem(itemId: string, motivo?: string): Promise<void> {
  const notaExtra = motivo?.trim() ? `ANULADO: ${motivo.trim()}` : "ANULADO";
  await updateDoc(doc(db, PEDIDO_ITEMS_COL, itemId), {
    estado: "entregado",
    nota: notaExtra,
  });
}

export async function cerrarPedido(pedidoId: string): Promise<void> {
  const items = await getPedidoItemsPorPedido(pedidoId);
  const total = items.reduce((acum, item) => acum + (item.precioUnitario || 0) * (item.cantidad || 1), 0);

  await updateDoc(doc(db, PEDIDOS_COL, pedidoId), {
    estadoMesa: "cerrado",
    cerradoEn: serverTimestamp(),
    total,
  });
}

export async function getPedidosAbiertos(): Promise<Pedido[]> {
  const ref = collection(db, PEDIDOS_COL);
  const q = query(ref, where("estadoMesa", "==", "abierto"), limit(500));
  const snap = await getDocs(q);

  const pedidos = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      mesaCodigo: data.mesaCodigo,
      mesaNombre: data.mesaNombre,
      estadoMesa: (data.estadoMesa as PedidoEstadoMesa) ?? "abierto",
      creadoEn: parseFirestoreDate(data.creadoEn),
      cerradoEn: parseFirestoreDate(data.cerradoEn),
      total: typeof data.total === "number" ? data.total : 0,
      llamoMozo: !!data.llamoMozo,
      pidioCuenta: !!data.pidioCuenta,
    } satisfies Pedido;
  });

  pedidos.sort((a, b) => dateMs(a.creadoEn) - dateMs(b.creadoEn));
  return pedidos;
}

/**
 * ⚠️ Legacy: NO recomendado en producción (trae toda la colección).
 * Dejalo solo si lo usás en algún admin chico.
 */
export async function getPedidoItemsActivos(): Promise<PedidoItem[]> {
  const ref = collection(db, PEDIDO_ITEMS_COL);
  const snap = await getDocs(ref);

  const items = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      pedidoId: data.pedidoId,
      mesaCodigo: data.mesaCodigo,
      mesaNombre: data.mesaNombre,
      tipo: data.tipo as "menu" | "manual",
      platoId: data.platoId ?? undefined,
      nombre: data.nombre ?? "",
      nota: data.nota ?? "",
      precioUnitario: data.precioUnitario ?? 0,
      cantidad: data.cantidad ?? 1,
      estado: (data.estado as PedidoItemEstado) ?? "pendiente",
      creadoEn: parseFirestoreDate(data.creadoEn),
    } satisfies PedidoItem;
  });

  items.sort((a, b) => dateMs(a.creadoEn) - dateMs(b.creadoEn));
  return items;
}
