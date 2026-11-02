import { describe, expect, it } from "vitest";
import { applyTheme, clearTheme } from "./themeTokens";

// Token names vs the DTCG source and generated CSS: dtcgTokens.test.ts
describe("applyTheme", () => {
  const rootStyle = () => document.documentElement.style;

  it("should set the given tokens as CSS variables on <html>", () => {
    applyTheme({ primary: "#2563eb", radius: "0px" });

    expect(rootStyle().getPropertyValue("--primary")).toBe("#2563eb");
    expect(rootStyle().getPropertyValue("--radius")).toBe("0px");
  });

  it("should leave the color mode class alone", () => {
    document.documentElement.classList.add("dark");

    applyTheme({ primary: "#2563eb" });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should add to earlier overrides", () => {
    applyTheme({ primary: "#2563eb" });
    applyTheme({ radius: "0px" });

    expect(rootStyle().getPropertyValue("--primary")).toBe("#2563eb");
    expect(rootStyle().getPropertyValue("--radius")).toBe("0px");
  });

  it("should remove only theme tokens on clearTheme", () => {
    rootStyle().setProperty("--status-w", "6rem");
    applyTheme({ primary: "#2563eb", "button-radius": "4px" });

    clearTheme();

    expect(rootStyle().getPropertyValue("--primary")).toBe("");
    expect(rootStyle().getPropertyValue("--button-radius")).toBe("");
    expect(rootStyle().getPropertyValue("--status-w")).toBe("6rem");
  });
});
