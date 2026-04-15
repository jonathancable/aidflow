// apps/api/src/tests/unit/permissions.test.ts
import { describe, it, expect } from "vitest";
import { hasPermission } from "@config/permissions";

describe("Permission map — system_admin", () => {
  it("can create programs", () =>
    expect(hasPermission("system_admin", "programs", "create")).toBe(true));
  it("can approve allocations", () =>
    expect(hasPermission("system_admin", "allocations", "approve")).toBe(true));
  it("can access settings", () =>
    expect(hasPermission("system_admin", "settings", "update")).toBe(true));
});

describe("Permission map — donor", () => {
  it("can create contributions", () =>
    expect(hasPermission("donor", "contributions", "create")).toBe(true));
  it("cannot approve allocations", () =>
    expect(hasPermission("donor", "allocations", "approve")).toBe(false));
  it("cannot access distribution", () =>
    expect(hasPermission("donor", "distribution", "read")).toBe(false));
  it("cannot access audit logs", () =>
    expect(hasPermission("donor", "audit", "read")).toBe(false));
  it("cannot access settings", () =>
    expect(hasPermission("donor", "settings", "read")).toBe(false));
});

describe("Permission map — ngo", () => {
  it("can create distribution batches", () =>
    expect(hasPermission("ngo", "distribution", "create")).toBe(true));
  it("cannot approve allocations", () =>
    expect(hasPermission("ngo", "allocations", "approve")).toBe(false));
  it("cannot access audit logs", () =>
    expect(hasPermission("ngo", "audit", "read")).toBe(false));
});

describe("Permission map — system_controller", () => {
  it("can approve allocations", () =>
    expect(hasPermission("system_controller", "allocations", "approve")).toBe(
      true,
    ));
  it("can release distribution", () =>
    expect(hasPermission("system_controller", "distribution", "release")).toBe(
      true,
    ));
  it("cannot delete users", () =>
    expect(hasPermission("system_controller", "users", "delete")).toBe(false));
});

describe("Permission map — beneficiary", () => {
  it("can read own profile", () =>
    expect(hasPermission("beneficiary", "beneficiaries", "read")).toBe(true));
  it("cannot read programs", () =>
    expect(hasPermission("beneficiary", "programs", "read")).toBe(false));
  it("cannot read wallets", () =>
    expect(hasPermission("beneficiary", "wallets", "read")).toBe(false));
  it("cannot create anything", () =>
    expect(hasPermission("beneficiary", "contributions", "create")).toBe(
      false,
    ));
});

describe("Permission map — vendor", () => {
  it("can update own orders", () =>
    expect(hasPermission("vendor", "vendors", "update")).toBe(true));
  it("cannot approve anything", () =>
    expect(hasPermission("vendor", "allocations", "approve")).toBe(false));
  it("can read own user profile", () =>
    expect(hasPermission("vendor", "users", "read")).toBe(true));
  it("cannot create or delete users", () => {
    expect(hasPermission("vendor", "users", "create")).toBe(false);
    expect(hasPermission("vendor", "users", "delete")).toBe(false);
  });
});

describe("Deny by default", () => {
  it("unknown role returns false", () =>
    expect(hasPermission("unknown_role" as never, "programs", "read")).toBe(
      false,
    ));
  it("unknown resource returns false", () =>
    expect(hasPermission("donor", "unknown_resource", "read")).toBe(false));
});
