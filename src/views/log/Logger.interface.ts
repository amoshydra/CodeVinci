import structuredClone from "@ungap/structured-clone";

export interface LogPropLog {
  method: string,
  args: structuredClone.SerializedRecord
}
