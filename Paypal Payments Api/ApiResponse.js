// ============================================================
// ApiResponse
// A small helper to keep every successful response in the same
// shape, so API consumers can rely on a consistent contract:
// { success, message, data }
// ============================================================

export default class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}
