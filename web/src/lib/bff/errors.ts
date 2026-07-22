export type BffErrorCode =
  | "unauthorized"
  | "bad_credentials"
  | "odoo_unavailable"
  | "not_found";

export class BffError extends Error {
  constructor(
    readonly code: BffErrorCode,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "BffError";
  }
}
