/**
 * Both tools open in the browser's language when the person has not picked
 * one yet: a Brazilian browser gets Portuguese, a Mexican one Spanish, and
 * anything else English.
 */
import { describe, it, expect } from "vitest";
import { detectBrowserLanguage as gridDetect } from "@/tools/unbsgrid/i18n/types";
import { detectBrowserLanguage as colorDetect } from "@/tools/unbscolor/i18n/LanguageContext";

describe.each([
  ["UNBSGRID", gridDetect],
  ["UNBSCOLOR", colorDetect],
])("%s — idioma inicial", (_tool, detect) => {
  it("usa a região do navegador", () => {
    expect(detect(["pt-BR"])).toBe("pt");
    expect(detect(["es-MX"])).toBe("es");
    expect(detect(["en-US"])).toBe("en");
  });

  it("pula idiomas que a ferramenta não tem até achar um que ela tem", () => {
    expect(detect(["fr-FR", "de", "pt-PT"])).toBe("pt");
    expect(detect(["ja", "es"])).toBe("es");
  });

  it("cai no inglês quando não há dica utilizável", () => {
    expect(detect(["fr-FR", "de-DE"])).toBe("en");
    expect(detect([])).toBe("en");
    expect(detect(undefined)).toBe("en");
    expect(detect([""])).toBe("en");
  });

  it("não se confunde com maiúsculas", () => {
    expect(detect(["PT-br"])).toBe("pt");
  });
});
