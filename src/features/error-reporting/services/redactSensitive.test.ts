import { describe, expect, it } from "vitest";
import { redactSensitiveText, sanitizeUrl } from "./redactSensitive";

describe("redactSensitiveText", () => {
  it("should replace emails when the text contains one", () => {
    expect(redactSensitiveText("User jane.doe+x@example.com already registered")).toBe(
      "User [email] already registered"
    );
  });

  it("should replace JWT-shaped tokens when the text contains one", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl";
    expect(redactSensitiveText(`token ${jwt} rejected`)).toBe("token [token] rejected");
  });

  it("should replace Supabase keys when the text contains one", () => {
    expect(redactSensitiveText("key sb_publishable_abc123DEF_ghi failed")).toBe("key [key] failed");
  });

  it("should replace bearer credentials when the text contains one", () => {
    expect(redactSensitiveText("Authorization: Bearer abc.def-ghi123")).toBe(
      "Authorization: Bearer [token]"
    );
  });

  it("should cut query and fragment from URLs inside a stack but keep line and column", () => {
    expect(redactSensitiveText("at f (https://app.test/assets/a.js?t=1700&x=2:10:5)")).toBe(
      "at f (https://app.test/assets/a.js:10:5)"
    );
    expect(redactSensitiveText("see https://app.test/cb#access_token=abc")).toBe(
      "see https://app.test/cb"
    );
  });

  it("should leave harmless text unchanged", () => {
    expect(redactSensitiveText("Cannot read properties of undefined")).toBe(
      "Cannot read properties of undefined"
    );
  });
});

describe("sanitizeUrl", () => {
  it("should keep origin and path and drop query and fragment", () => {
    expect(sanitizeUrl("https://app.test/auth/callback?code=secret#access_token=t")).toBe(
      "https://app.test/auth/callback"
    );
  });

  it("should return a marker when the value is not a URL", () => {
    expect(sanitizeUrl("not a url")).toBe("[invalid-url]");
  });
});
