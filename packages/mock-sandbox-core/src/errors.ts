export type ErrorCode =
  | "DETECT_FAIL"
  | "DISCOVERY_FAIL"
  | "DMR_UNREACHABLE"
  | "DMR_RESPONSE_ERROR"
  | "SANDBOX_FAIL"
  | "MOCK_GENERATION_FAIL"
  | "FILE_WRITE_ERROR"
  | "INVALID_CONFIG";

export class ToolError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "ToolError";
    Object.setPrototypeOf(this, ToolError.prototype);
  }
}
