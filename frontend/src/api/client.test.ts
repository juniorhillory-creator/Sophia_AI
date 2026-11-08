import { describe, expect, it } from "vitest";
<<<<<<< HEAD
import {
  MAX_UPLOAD_BYTES,
  rejectUpload,
  toApiError,
  setAuthToken,
  getAuthToken,
} from "./client";
=======
import { MAX_UPLOAD_BYTES, rejectUpload, toApiError } from "./client";
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81

function file(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe("rejectUpload", () => {
  it("accepts a PDF within the server byte cap", () => {
    expect(rejectUpload(file("paper.pdf", "application/pdf", MAX_UPLOAD_BYTES))).toBeNull();
  });

  it("rejects a non-PDF, an empty file, and a file over the cap", () => {
    expect(rejectUpload(file("notes.txt", "text/plain", 12))).toMatch(/PDF/);
    expect(rejectUpload(file("empty.pdf", "application/pdf", 0))).toMatch(/empty/);
    expect(rejectUpload(file("big.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1))).toMatch(/20 MB/);
  });
});

describe("toApiError", () => {
  it("uses the server error body when the shape matches", () => {
    const error = toApiError(404, { code: "not_found", message: "Document not found." });
    expect(error.code).toBe("not_found");
    expect(error.message).toBe("Document not found.");
    expect(error.status).toBe(404);
  });

  it("does not treat a partial body as a server message", () => {
    expect(toApiError(500, { detail: "boom" }).code).toBe("http_error");
  });
});
<<<<<<< HEAD

describe("auth tokens", () => {
  it("sets and retrieves the in-memory authorization token", () => {
    setAuthToken("test-jwt-token-12345");
    expect(getAuthToken()).toBe("test-jwt-token-12345");
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });
});
=======
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
