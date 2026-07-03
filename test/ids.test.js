import test from "node:test";
import assert from "node:assert/strict";

import { makeId, resetIds, seedIdsFromDoc } from "../src/utils/ids.js";

test("seedIdsFromDoc advances the counter past the largest suffix in the doc", () => {
  resetIds();

  seedIdsFromDoc({
    objects: [{ id: "pt_000007" }, { id: "seg_000020" }],
    annotations: [{ id: "lbl_000012" }],
  });

  assert.equal(makeId("pt"), "pt_000021");
});

test("seedIdsFromDoc never rewinds the counter", () => {
  resetIds();
  makeId();
  makeId();
  makeId();

  seedIdsFromDoc({ objects: [{ id: "pt_000001" }], annotations: [] });

  assert.equal(makeId("pt"), "pt_000004");
});

test("seedIdsFromDoc ignores ids without a numeric suffix and missing fields", () => {
  resetIds();

  seedIdsFromDoc({
    objects: [{ id: "weird-id" }, {}, { id: 42 }],
    annotations: null,
  });

  assert.equal(makeId("pt"), "pt_000001");
});
