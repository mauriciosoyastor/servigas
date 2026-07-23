export type BffErrorCode =
  | "unauthorized"
  | "bad_credentials"
  | "odoo_unavailable"
  | "not_found";

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
