import { mockFromZod } from "./mock/wrappers.js";
import { User, UserSchema } from "./schema.js";
import { IDataSource, Scenario } from "./types.js";

export class FactoryDataSource implements IDataSource<User> {
  async getPage(params: {
    page: number;
    pageSize: number;
    scenario: Scenario;
  }): Promise<{ rows: User[]; total: number }> {
    const { page, pageSize, scenario } = params;

    if (scenario === "Empty") {
      return { rows: [], total: 0 };
    }

    // Deterministic seed based on scenario and page
    const seed = `${scenario}-${page}`;
    const total = scenario === "Typical" ? 100 : 25;
    const start = page * pageSize;

    if (start >= total) {
      return { rows: [], total };
    }

    const count = Math.min(pageSize, total - start);
    const rows: User[] = [];

    for (let i = 0; i < count; i++) {
      const rowSeed = `${seed}-${i}`;
      const mock = mockFromZod<User>(UserSchema, {
        seed: rowSeed,
        overrides: this.getOverridesForScenario(scenario, i),
      });
      rows.push(mock);
    }

    return { rows, total };
  }

  private getOverridesForScenario(scenario: Scenario, index: number) {
    const overrides: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    switch (scenario) {
      case "Edge_LongText":
        overrides["/name"] = "A".repeat(200);
        overrides["/email"] = "very.long.email.address.test@example.com";
        break;
      case "Edge_MissingEmail":
        if (index % 2 === 0) {
          overrides["/email"] = "";
        }
        break;
      case "Edge_ZeroMRR":
        overrides["/mrr"] = 0;
        overrides["/active"] = false;
        break;
    }

    return overrides;
  }
}
