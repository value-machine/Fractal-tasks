import { describe, it, expect } from "vitest";
import { mapAuthError } from "./authErrorMessages";

describe("mapAuthError", () => {
  it("should map unauthorized addresses when the built-in mailer refuses the email", () => {
    expect(
      mapAuthError({
        code: "email_address_not_authorized",
        message: "Email address not authorized",
      })
    ).toBe("Sign-in emails can't be sent to this address yet. Continue with GitHub or Google.");
  });

  it("should map the email send limit when too many sign-in links were sent", () => {
    expect(
      mapAuthError({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" })
    ).toBe(
      "Too many sign-in emails were sent. Please wait up to an hour, or continue with GitHub or Google."
    );
  });

  it("should map rate limits when too many attempts", () => {
    expect(mapAuthError(new Error("Request rate limit reached"))).toBe(
      "Too many attempts. Please wait a few minutes and try again."
    );
  });

  it("should map network errors when fetch fails", () => {
    expect(mapAuthError(new Error("Failed to fetch"))).toBe(
      "Network error. Please check your connection and try again."
    );
  });

  it("should fall back to a generic message when error is unknown", () => {
    expect(mapAuthError({})).toBe("Something went wrong. Please try again.");
  });
});
