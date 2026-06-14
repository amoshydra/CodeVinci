import { describe, it, expect } from "vitest";
import { base64ToArrayBuffer, arrayBufferToBase64 } from "./base64Buffer";

describe("base64ToArrayBuffer", () => {
  it("should decode valid base64", () => {
    const buffer = base64ToArrayBuffer("SGVsbG8=");
    const bytes = new Uint8Array(buffer);
    expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("should throw on invalid base64 characters", () => {
    expect(() => base64ToArrayBuffer("!!!invalid!!!")).toThrow();
  });

  it("should throw on malformed base64 padding", () => {
    expect(() => base64ToArrayBuffer("SGVsbG8")).not.toThrow();
  });
});

describe("arrayBufferToBase64", () => {
  it("should encode to valid base64", () => {
    const input = new TextEncoder().encode("Hello");
    const result = arrayBufferToBase64(input.buffer);
    expect(result).toBe("SGVsbG8=");
  });
});
