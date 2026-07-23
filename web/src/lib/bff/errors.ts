export type BffErrorCode =
  | "unauthorized"
  | "bad_credentials"
  | "odoo_unavailable"
  | "not_found"
<<<<<<< HEAD
  | "validation_error"
  | "checkout_failed"
  | "action_failed";
=======
  | "checkout_failed";
>>>>>>> 0dad2e2 (fix(web): checkout POS fail-loud sin fallback sale.order)

export class BffError extends Error {
  readonly code: BffErrorCode;
  readonly status: number;

  constructor(code: BffErrorCode, status: number, message: string) {
    super(message);
    this.name = "BffError";
    this.code = code;
    this.status = status;
  }
}
