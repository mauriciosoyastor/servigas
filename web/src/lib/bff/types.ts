export type AccentKey =
  | "flame-yellow"
  | "flame-orange"
  | "flame-deep"
  | "flame-rust"
  | "bg-mid"
  | "bg-charcoal"
  | "bg-deep";

export type LauncherTile = {
  id: number;
  label: string;
  hint: string;
  icon: string;
  enter_label: string;
  target_type: "hub" | "action";
  client_tag: string;
  accent_key: AccentKey | string;
  value: string;
  action: Record<string, unknown> | false;
};

export type HubCard = {
  id: number;
  label: string;
  hint: string;
  icon: string;
  variant: "default" | "warning" | string;
  accent_key: AccentKey | string;
  enter_label: string;
  value: string;
  action: Record<string, unknown>;
};

export type HubGroup = {
  code: string;
  name: string;
  icon: string;
  cards: HubCard[];
};

export type HubSection = { code: string; name: string; icon: string };

export type LauncherPayload = { tiles: LauncherTile[] };

export type HubPayload = {
  app: string;
  section: string;
  sections: HubSection[];
  groups: HubGroup[];
  cards: HubCard[];
};

export type SessionInfo = { uid: number; name: string; login: string };

export type RecordListColumn = {
  key: string;
  label: string;
  kind?: "text" | "image";
};

export type RecordListRow = Record<
  string,
  string | number | boolean | null
>;

export type RecordListPayload = {
  key: string;
  title: string;
  hint: string;
  model: string;
  total: number;
  page: number;
  pageSize: number;
  q: string;
  hubBack: string;
  columns: RecordListColumn[];
  rows: RecordListRow[];
};

export type RecordDetailLines = {
  title: string;
  columns: { key: string; label: string }[];
  rows: RecordListRow[];
};

export type RecordDetailPayload = {
  key: string;
  title: string;
  model: string;
  hubBack: string;
  listPath: string;
  fields: { key: string; label: string; value: string | number | boolean | null }[];
  imageUrl: string | null;
  lines?: RecordDetailLines | null;
};

export type PosCatalogProduct = {
  id: number;
  name: string;
  default_code: string | null;
  barcode: string | null;
  list_price: number;
  qty_available: number;
  image_url: string | null;
};

export type PosPaymentMethod = {
  id: number;
  name: string;
  isCash: boolean;
};

export type PosCatalogPayload = {
  config: { id: number; name: string } | null;
  products: PosCatalogProduct[];
  paymentMethods: PosPaymentMethod[];
  total: number;
  q: string;
};

export type PosCheckoutLine = {
  productId: number;
  qty: number;
  price: number;
  discount?: number;
};

export type PosCheckoutOptions = {
  paymentMethodId?: number;
};

export type PosCheckoutResult = {
  orderId: number;
  orderName: string;
  detailPath: string;
  channel: "pos.order" | "sale.order";
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  amountTotal: number;
};
