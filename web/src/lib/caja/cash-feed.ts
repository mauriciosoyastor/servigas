export type CashMedium = "cash" | "transfer" | "card" | "other";

export type CashFeedKind =
  | "pos_sale"
  | "payment_in"
  | "payment_out"
  | "manual_in"
  | "manual_out";

export type CashFeedItem = {
  id: string;
  at: string;
  kind: CashFeedKind;
  medium: CashMedium;
  amount: number;
  label: string;
  reference?: string | null;
  href?: string | null;
};

export type CashSummary = {
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  transferTotal: number;
  cardTotal: number;
  movementCount: number;
};

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isInboundKind(kind: CashFeedKind): boolean {
  return kind === "pos_sale" || kind === "payment_in" || kind === "manual_in";
}

export function mergeCashFeed(items: CashFeedItem[]): CashFeedItem[] {
  return [...items].sort((a, b) => {
    const byDate = String(b.at).localeCompare(String(a.at));
    if (byDate !== 0) return byDate;
    return String(b.id).localeCompare(String(a.id));
  });
}

export function summarizeCash(
  openingBalance: number,
  items: CashFeedItem[]
): CashSummary {
  let cashIn = 0;
  let cashOut = 0;
  let transferTotal = 0;
  let cardTotal = 0;

  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount <= 0) continue;
    const inbound = isInboundKind(item.kind);

    if (item.medium === "cash") {
      if (inbound) cashIn += amount;
      else cashOut += amount;
      continue;
    }
    if (item.medium === "transfer") {
      transferTotal += inbound ? amount : -amount;
      continue;
    }
    if (item.medium === "card") {
      cardTotal += inbound ? amount : -amount;
    }
  }

  const opening = Number(openingBalance) || 0;
  return {
    openingBalance: roundCents(opening),
    cashIn: roundCents(cashIn),
    cashOut: roundCents(cashOut),
    expectedCash: roundCents(opening + cashIn - cashOut),
    transferTotal: roundCents(transferTotal),
    cardTotal: roundCents(cardTotal),
    movementCount: items.length,
  };
}

export function classifyJournalMedium(
  journalType: string | null | undefined,
  journalName: string | null | undefined
): CashMedium {
  const type = String(journalType || "").toLowerCase();
  const name = String(journalName || "").toLowerCase();
  if (type === "cash" || /efectivo|caja|cash/.test(name)) return "cash";
  if (/tarjeta|card|credito|crédito|debito|débito/.test(name)) return "card";
  if (type === "bank" || /banco|transfer|transferencia/.test(name)) {
    return "transfer";
  }
  return "other";
}

export function classifyPosPaymentMedium(
  isCash: boolean,
  methodName: string | null | undefined
): CashMedium {
  if (isCash) return "cash";
  const name = String(methodName || "").toLowerCase();
  if (/tarjeta|card|credito|crédito|debito|débito/.test(name)) return "card";
  if (
    /banco|transfer|transferencia|mercado\s*pago|mercadopago|qr|billetera/.test(
      name
    )
  ) {
    return "transfer";
  }
  return "other";
}
