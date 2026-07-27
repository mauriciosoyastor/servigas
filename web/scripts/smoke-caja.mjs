/**
 * Smoke: abrir caja → mostrador desbloqueado → egreso → cerrar → historial/detalle.
 * Uso: node scripts/smoke-caja.mjs
 */
const base = process.env.SMOKE_BASE || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";

function cookieFrom(response) {
  const multi = response.headers.getSetCookie?.() || [];
  if (multi.length) {
    return multi.map((c) => c.split(";")[0]).join("; ");
  }
  const raw = response.headers.get("set-cookie") || "";
  return raw
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function main() {
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: loginName, password }),
  });
  if (!loginRes.ok) {
    throw new Error(`login failed ${loginRes.status} ${await loginRes.text()}`);
  }
  const cookie = cookieFrom(loginRes);
  const headers = { cookie, "content-type": "application/json" };

  const posBlockedHtml = await (
    await fetch(`${base}/pos`, { headers: { cookie } })
  ).text();
  if (!posBlockedHtml.includes("Abrí la caja primero")) {
    // May already have an open session from a previous run — close it first.
    const hub0 = await (
      await fetch(`${base}/api/caja`, { headers: { cookie } })
    ).json();
    if (!hub0.session) {
      throw new Error("POS should be blocked without cash session");
    }
  }

  let hub = await (
    await fetch(`${base}/api/caja`, { headers: { cookie } })
  ).json();
  if (hub.session) {
    const expected = hub.summary?.expectedCash ?? hub.session.openingBalance;
    const closeRes = await fetch(`${base}/api/caja/close`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        countedAmount: expected,
        bankDeposit: 0,
        leaveFloat: expected,
        differenceNote: "",
      }),
    });
    if (!closeRes.ok) {
      throw new Error(
        `pre-close failed ${closeRes.status} ${await closeRes.text()}`
      );
    }
  }

  const blockedAgain = await (
    await fetch(`${base}/pos`, { headers: { cookie } })
  ).text();
  if (!blockedAgain.includes("Abrí la caja primero")) {
    throw new Error("POS should be blocked after ensuring closed session");
  }

  const openRes = await fetch(`${base}/api/caja/open`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      openingBalance: 1000,
      note: "smoke",
      shift: "tarde",
    }),
  });
  const openBody = await openRes.json();
  if (!openRes.ok) {
    throw new Error(`open failed ${openRes.status} ${JSON.stringify(openBody)}`);
  }
  if (openBody.session?.shift !== "tarde") {
    throw new Error(`shift expected tarde got ${openBody.session?.shift}`);
  }

  const posOkHtml = await (
    await fetch(`${base}/pos`, { headers: { cookie } })
  ).text();
  if (posOkHtml.includes("Abrí la caja primero")) {
    throw new Error("POS still blocked after open");
  }
  if (!/<h1[^>]*>\s*Mostrador\s*<\/h1>/.test(posOkHtml)) {
    throw new Error("POS H1 should be Mostrador");
  }

  const moveRes = await fetch(`${base}/api/caja/move`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind: "out",
      amount: 200,
      motiveCode: "retiro_banco",
    }),
  });
  const moveBody = await moveRes.json();
  if (!moveRes.ok) {
    throw new Error(`move failed ${JSON.stringify(moveBody)}`);
  }

  hub = await (await fetch(`${base}/api/caja`, { headers: { cookie } })).json();
  if (!hub.summary || hub.summary.expectedCash !== 800) {
    throw new Error(
      `expected cash should be 800, got ${JSON.stringify(hub.summary)}`
    );
  }
  if (Number(hub.suggestedBankWithdraw) !== 0) {
    throw new Error(
      `suggestedBankWithdraw expected 0 got ${hub.suggestedBankWithdraw}`
    );
  }
  if (
    !hub.feed.some(
      (item) =>
        item.kind === "manual_out" &&
        item.amount === 200 &&
        item.label === "Retiro al banco"
    )
  ) {
    throw new Error("manual out missing from feed");
  }
  if (!Array.isArray(hub.history) || !Array.isArray(hub.alerts)) {
    throw new Error("hub missing history/alerts");
  }
  if (!hub.capabilities || typeof hub.capabilities.canOwnerWithdraw !== "boolean") {
    throw new Error("hub missing capabilities");
  }

  const filteredHtml = await (
    await fetch(`${base}/caja?filter=manual`, { headers: { cookie } })
  ).text();
  if (!filteredHtml.includes("is-active") || !filteredHtml.includes("Manuales")) {
    throw new Error("filter UI missing active Manuales");
  }

  const badClose = await fetch(`${base}/api/caja/close`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      countedAmount: 790,
      bankDeposit: 0,
      leaveFloat: 790,
    }),
  });
  if (badClose.ok) {
    throw new Error("close without difference note should fail");
  }

  const closeRes = await fetch(`${base}/api/caja/close`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      countedAmount: 790,
      bankDeposit: 300,
      leaveFloat: 490,
      differenceNote: "Faltante smoke",
    }),
  });
  const closeBody = await closeRes.json();
  if (!closeRes.ok) {
    throw new Error(`close failed ${JSON.stringify(closeBody)}`);
  }
  if (closeBody.session.state !== "closed") {
    throw new Error("session not closed");
  }
  if (Number(closeBody.session.difference) !== -10) {
    throw new Error(
      `difference expected -10 got ${closeBody.session.difference}`
    );
  }
  if (Number(closeBody.session.bankDeposit) !== 300) {
    throw new Error(`bankDeposit expected 300 got ${closeBody.session.bankDeposit}`);
  }
  if (Number(closeBody.session.leaveFloat) !== 490) {
    throw new Error(`leaveFloat expected 490 got ${closeBody.session.leaveFloat}`);
  }
  if (closeBody.session.differenceNote !== "Faltante smoke") {
    throw new Error("differenceNote not persisted");
  }

  const afterClose = await (
    await fetch(`${base}/pos`, { headers: { cookie } })
  ).text();
  if (!afterClose.includes("Abrí la caja primero")) {
    throw new Error("POS should block after close");
  }

  const history = await (
    await fetch(`${base}/api/caja/history`, { headers: { cookie } })
  ).json();
  if (!history.history?.some((item) => item.id === closeBody.session.id)) {
    throw new Error("closed session missing from history API");
  }

  const detail = await (
    await fetch(`${base}/api/caja/${closeBody.session.id}`, {
      headers: { cookie },
    })
  ).json();
  if (detail.session?.id !== closeBody.session.id) {
    throw new Error("detail API mismatch");
  }
  if (!Array.isArray(detail.feed)) {
    throw new Error("detail feed missing");
  }

  const detailHtml = await (
    await fetch(`${base}/caja/${closeBody.session.id}`, {
      headers: { cookie },
    })
  ).text();
  if (!detailHtml.includes("data-caja-print") || !detailHtml.includes("Faltante smoke")) {
    throw new Error("detail page missing print/diff note");
  }

  const home = await (await fetch(`${base}/`, { headers: { cookie } })).text();
  if (!home.includes(">Mostrador<") || !home.includes('href="/caja"')) {
    throw new Error("home ops-strip missing Mostrador/Caja");
  }

  console.log("SMOKE OK", {
    openId: openBody.session.id,
    expectedAfterMove: hub.summary.expectedCash,
    closeDiff: closeBody.session.difference,
    historyCount: history.history.length,
  });
}

main().catch((err) => {
  console.error("SMOKE FAIL", err);
  process.exit(1);
});
