import { describe, expect, it } from "vitest";
import { createIndependentDebt, getAccountStatementDebts } from "../client/src/utils/debtRecords";

describe("debt account statement records", () => {
  it("creates a separate statement item for every new debt added to the same client", () => {
    const commonInput = {
      personName: "  أحمد محمد  ",
      type: "to_me" as const,
      amount: 250,
      dueDate: "2026-09-01",
      startDate: "2026-08-14",
      category: "شخصي",
      description: "دفعة جديدة",
    };

    const firstDebt = createIndependentDebt(commonInput, "debt-first");
    const secondDebt = createIndependentDebt({ ...commonInput, amount: 175 }, "debt-second");
    const statementItems = [firstDebt, secondDebt].filter(
      debt => debt.personName.toLowerCase() === "أحمد محمد",
    );

    expect(statementItems).toHaveLength(2);
    expect(statementItems.map(debt => debt.id)).toEqual(["debt-first", "debt-second"]);
    expect(statementItems.map(debt => debt.amount)).toEqual([250, 175]);
    expect(getAccountStatementDebts([firstDebt, secondDebt], "أحمد محمد")).toEqual([firstDebt, secondDebt]);
  });
});
