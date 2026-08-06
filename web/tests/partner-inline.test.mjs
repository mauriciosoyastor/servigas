import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cuitConflictMessage,
  parsePartnerNew,
  parsePartnerResolution,
  partnerKindFromListKey,
  partnerNewFromWorkshopOwner,
  partnerNamesMatch,
} from "../src/lib/shell/partner-inline.ts";

describe("partner-inline parsing", () => {
  it("accepts partnerId resolution", () => {
    assert.deepEqual(parsePartnerResolution({ partnerId: "6" }), {
      partnerId: 6,
    });
  });

  it("accepts partnerNew when no partnerId", () => {
    assert.deepEqual(
      parsePartnerResolution({
        partnerNew: {
          name: " Juan ",
          phone: "3515551234",
          email: "a@b.com",
          vat: "20-12345678-6",
        },
      }),
      {
        partnerNew: {
          name: "Juan",
          phone: "3515551234",
          email: "a@b.com",
          vat: "20-12345678-6",
        },
      }
    );
  });

  it("prefers partnerId over partnerNew", () => {
    assert.deepEqual(
      parsePartnerResolution({
        partnerId: 3,
        partnerNew: { name: "Otro" },
      }),
      { partnerId: 3 }
    );
  });

  it("rejects empty resolution", () => {
    assert.equal(parsePartnerResolution({}), null);
    assert.equal(parsePartnerNew({ name: "  " }), null);
  });

  it("matches partner names case-insensitively", () => {
    assert.equal(partnerNamesMatch("Juan Pérez", "juan pérez"), true);
    assert.equal(partnerNamesMatch("Juan", "Pedro"), false);
  });

  it("builds cuit conflict message", () => {
    assert.match(
      cuitConflictMessage("20123456786", "ACME SA"),
      /20123456786.*ACME SA/
    );
  });

  it("maps list keys to partner kind", () => {
    assert.equal(partnerKindFromListKey("sales/quotations"), "customer");
    assert.equal(
      partnerKindFromListKey("accounting/vendor-bills"),
      "supplier"
    );
    assert.equal(partnerKindFromListKey("purchase/solicitudes"), "supplier");
  });

  it("derives workshop partner from owner fields", () => {
    assert.deepEqual(
      partnerNewFromWorkshopOwner({
        owner_name: "María",
        owner_phone: "351",
        partner_email: "m@x.com",
      }),
      {
        name: "María",
        phone: "351",
        email: "m@x.com",
      }
    );
  });
});
