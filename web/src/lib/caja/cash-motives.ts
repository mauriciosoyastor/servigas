export type CashMoveKind = "in" | "out";

export type CashMotive = {
  code: string;
  label: string;
  requiresNote?: boolean;
};

export const CASH_MOTIVES_IN: CashMotive[] = [
  { code: "refuerzo", label: "Refuerzo de caja" },
  { code: "aporte_dueno", label: "Aporte del dueño" },
  { code: "reintegro_proveedor", label: "Reintegro / devolución proveedor" },
  { code: "cobro_ot", label: "Cobro orden de trabajo" },
  { code: "otro_ingreso", label: "Otro ingreso", requiresNote: true },
];

export const CASH_MOTIVES_OUT: CashMotive[] = [
  { code: "retiro_banco", label: "Retiro al banco" },
  { code: "retiro_dueno", label: "Retiro del dueño" },
  { code: "pago_proveedor", label: "Pago proveedor / compra contado" },
  { code: "gasto_caja_chica", label: "Gasto caja chica" },
  { code: "adelanto_personal", label: "Adelanto / vale personal" },
  { code: "devolucion_cliente", label: "Devolución a cliente" },
  { code: "otro_egreso", label: "Otro egreso", requiresNote: true },
];

export function motivesForKind(kind: CashMoveKind): CashMotive[] {
  return kind === "out" ? CASH_MOTIVES_OUT : CASH_MOTIVES_IN;
}

export function resolveCashMotive(
  kind: CashMoveKind,
  code: string | null | undefined
): CashMotive | null {
  const normalized = String(code || "").trim();
  if (!normalized) return null;
  return motivesForKind(kind).find((motive) => motive.code === normalized) || null;
}

export function buildCashMovementReason(
  kind: CashMoveKind,
  motiveCode: string,
  note?: string | null
): string {
  const motive = resolveCashMotive(kind, motiveCode);
  if (!motive) {
    throw new Error("El motivo no es válido para este tipo de movimiento");
  }
  const trimmedNote = String(note || "").trim();
  if (motive.requiresNote && !trimmedNote) {
    throw new Error("Indicá una nota para el motivo Otro");
  }
  if (trimmedNote) {
    return `${motive.label} · ${trimmedNote}`.slice(0, 120);
  }
  return motive.label;
}
