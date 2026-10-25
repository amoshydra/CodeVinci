import structuredClone from "@ungap/structured-clone";

export type OnFrameMessage = (message: FrameMessage) => void;

export interface FrameMessage {
  method: string;
  args: structuredClone.SerializedRecord
}

export interface MessageEventFrameMessage extends FrameMessage {
  _id: "codevinci"
}

export interface CspViolation {
  blockedURI: string;
  effectiveDirective: string;
  disposition: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
}
