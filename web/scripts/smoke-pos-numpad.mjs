const base = "http://127.0.0.1:4321";
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorb(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ login: "admin", password: "admin" }),
});
absorb(login);
const loginBody = await login.json();
if (!login.ok) {
  console.error("login fail", login.status, loginBody);
  process.exit(1);
}

const pos = await fetch(`${base}/pos`, { headers: { cookie: cookieHeader() } });
absorb(pos);
const html = await pos.text();
if (!pos.ok) {
  console.error("pos page fail", pos.status);
  process.exit(1);
}
const hasPad =
  html.includes("data-pos-numpad") &&
  html.includes('data-np-mode="qty"') &&
  html.includes('data-np-mode="order_discount"') &&
  html.includes("data-np-apply");
console.log("pos_html", pos.status, "numpad", hasPad);

const cat = await fetch(`${base}/api/pos/catalog`, {
  headers: { cookie: cookieHeader() },
});
absorb(cat);
const catalog = await cat.json();
if (!cat.ok) {
  console.error("catalog fail", cat.status, catalog);
  process.exit(1);
}
const product = (catalog.products || [])[0];
const pay = (catalog.paymentMethods || [])[0];
if (!product || !pay) {
  console.error("missing product/pay", { product, pay });
  process.exit(1);
}

const price = Number(product.list_price) || 100;
const checkout = await fetch(`${base}/api/pos/checkout`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie: cookieHeader(),
  },
  body: JSON.stringify({
    paymentMethodId: pay.id,
    lines: [{ productId: product.id, qty: 1, price, discount: 19 }],
  }),
});
absorb(checkout);
const result = await checkout.json();
console.log(
  "checkout",
  checkout.status,
  result.orderName || result.error || result,
  "total",
  result.amountTotal
);
if (!checkout.ok || !hasPad) process.exit(1);
console.log("SMOKE_OK");
