export type Scenario =
  | "Empty"
  | "Typical"
  | "Edge_LongText"
  | "Edge_MissingEmail"
  | "Edge_ZeroMRR";

export interface IDataSource<T> {
  getPage(params: {
    page: number;
    pageSize: number;
    scenario: Scenario;
  }): Promise<{ rows: T[]; total: number }>;
}
