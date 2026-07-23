export type BffErrorCode =
  | "unauthorized"
  | "bad_credentials"
  | "odoo_unavailable"
  | "not_found"
  | "validation_error"
  | "checkout_failed"
  | "action_failed";

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
