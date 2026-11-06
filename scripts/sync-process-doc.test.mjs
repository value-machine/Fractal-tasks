import { test } from "node:test";
import assert from "node:assert/strict";

import { renderProcessModule, toTemplateLiteral } from "./sync-process-doc.mjs";

test("should keep backticks, backslashes and ${ verbatim when the module is evaluated", async () => {
  const text = "Use `code`, a path C:\\temp and a ${placeholder}.\n";
  const source = renderProcessModule(text);
  const url = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
  const { PROCESS_DOC } = await import(url);
  assert.equal(PROCESS_DOC, text);
});

test("should leave plain text unchanged when it has nothing to escape", () => {
  assert.equal(toTemplateLiteral("# The Process\n\nPlain text."), "# The Process\n\nPlain text.");
});
