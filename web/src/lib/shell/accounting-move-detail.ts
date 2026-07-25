/**
 * Resolve specialized Astro ficha for an account.move from Todos los asientos.
 */

const MOVE_DETAIL_BY_TYPE: Record<string, string> = {
  out_invoice: "/lists/accounting/customer-invoices",
  in_invoice: "/lists/accounting/vendor-bills",
  out_refund: "/lists/accounting/credit-notes",
  in_refund: "/lists/accounting/vendor-refunds",
};

export function resolveAccountingMoveDetailPath(
  moveType: unknown,
  id: number
): string | null {
  if (!Number.isFinite(id) || id <= 0) return null;
  const type = String(moveType ?? "").trim();
  const base = MOVE_DETAIL_BY_TYPE[type];
  if (!base) return null;
  return `${base}/${id}`;
}
