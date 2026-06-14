import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LoaderOutputViewBase64 } from "./LoaderOutputView.base64";

describe("LoaderOutputViewBase64", () => {
  it("should not crash with invalid percent-encoded input", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() =>
      render(<LoaderOutputViewBase64 value={'%GG'} />)
    ).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it("should not crash with trailing percent sign", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() =>
      render(<LoaderOutputViewBase64 value={'hello%'} />)
    ).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it("should not crash with incomplete percent encoding", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() =>
      render(<LoaderOutputViewBase64 value={'%1'} />)
    ).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it("should not crash with mixed invalid percent sequences", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() =>
      render(<LoaderOutputViewBase64 value={'foo%ZZbar%2%baz'} />)
    ).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it("should not crash with URL-encoded separator and invalid percent encoding after", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // URL-encoded separator doesn't match, so decodeURIComponent is called on the full string
    expect(() =>
      render(<LoaderOutputViewBase64 value={'data%3DH4sIAAAAAAAAA%GG'} />)
    ).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it("should handle valid base64 input without crashing", () => {
    const validGzipBase64 =
      'H4sIAAAAAAAAA/3BUQEAAADCoPVPbQwHFAAAtjwqiwAAAA==';
    expect(() =>
      render(<LoaderOutputViewBase64 value={validGzipBase64} />)
    ).not.toThrow();
  });

  it("should handle empty string without crashing", () => {
    expect(() =>
      render(<LoaderOutputViewBase64 value="" />)
    ).not.toThrow();
  });
});
