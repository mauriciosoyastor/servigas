/**
 * Workshop serial helpers + work-order create filter (Astro BFF).
 */

export function normalizeSerial(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export type WorkOrderCreateValues = {
  serial_number: string;
  date?: string;
  brand?: string;
  model?: string;
  appliance_name?: string;
  gas_type?: "gn" | "ge" | "";
  owner_name?: string;
  owner_phone?: string;
  partner_id?: number;
  problem?: string;
  observation?: string;
  work_done?: string;
  materials?: string;
  amount?: number;
  attachment?: {
    filename: string;
    mimetype: string;
    content: string;
  };
};

function asTrimmed(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

export function filterWorkOrderCreateValues(
  values: Record<string, unknown>
): WorkOrderCreateValues | null {
  const serial_number = normalizeSerial(
    values.serial_number ?? values.serialNumber
  );
  if (!serial_number) return null;

  const out: WorkOrderCreateValues = { serial_number };

  const date = asTrimmed(values.date);
  if (date) out.date = date;

  const brand = asTrimmed(values.brand);
  if (brand) out.brand = brand;
  const model = asTrimmed(values.model);
  if (model) out.model = model;
  const appliance_name = asTrimmed(
    values.appliance_name ?? values.applianceName ?? values.name
  );
  if (appliance_name) out.appliance_name = appliance_name;

  const gas = asTrimmed(values.gas_type ?? values.gasType).toLowerCase();
  if (gas === "gn" || gas === "ge") out.gas_type = gas;
  else if (gas === "") out.gas_type = "";

  const owner_name = asTrimmed(values.owner_name ?? values.ownerName);
  if (owner_name) out.owner_name = owner_name;
  const owner_phone = asTrimmed(values.owner_phone ?? values.ownerPhone);
  if (owner_phone) out.owner_phone = owner_phone;

  const partnerId = Number(values.partner_id ?? values.partnerId);
  if (Number.isFinite(partnerId) && partnerId > 0) out.partner_id = partnerId;

  for (const key of [
    "problem",
    "observation",
    "work_done",
    "materials",
  ] as const) {
    const camel =
      key === "work_done"
        ? "workDone"
        : key === "observation"
          ? "observation"
          : key;
    const text = asTrimmed(values[key] ?? values[camel]);
    if (text) out[key] = text;
  }

  if ("amount" in values || "importe" in values) {
    const amount = Number(values.amount ?? values.importe);
    if (Number.isFinite(amount) && amount >= 0) out.amount = amount;
  }

  const att = values.attachment;
  if (att && typeof att === "object") {
    const row = att as Record<string, unknown>;
    const filename = asTrimmed(row.filename ?? row.name) || "chapa.jpg";
    const mimetype = asTrimmed(row.mimetype ?? row.mimeType) || "image/jpeg";
    const content = asTrimmed(row.content ?? row.datas ?? row.data);
    if (content) {
      out.attachment = { filename, mimetype, content };
    }
  }

  return out;
}

export function canCreateWorkOrder(listKey: string): boolean {
  return listKey === "workshop/orders";
}

export function canDeleteWorkOrder(listKey: string): boolean {
  return listKey === "workshop/orders";
}
