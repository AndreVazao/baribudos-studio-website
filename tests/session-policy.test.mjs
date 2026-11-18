import assert from "node:assert/strict";
import test from "node:test";

import { getActiveSessionUser } from "../src/lib/session-policy.mjs";

test("returns an active user unchanged", () => {
  const user = { id: "active-user", isActive: true };
  assert.equal(getActiveSessionUser(user), user);
});

test("rejects a deactivated user", () => {
  assert.equal(
    getActiveSessionUser({ id: "inactive-user", isActive: false }),
    null
  );
});

test("rejects a missing user", () => {
  assert.equal(getActiveSessionUser(null), null);
  assert.equal(getActiveSessionUser(undefined), null);
});

test("requires the persisted active flag to be the boolean true", () => {
  assert.equal(
    getActiveSessionUser({ id: "malformed-user", isActive: "true" }),
    null
  );
});
