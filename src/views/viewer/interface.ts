export type OnFrameMessage = (message: FrameMessage) => void;

export interface FrameMessage {
  method: string;
  args: any[]
}

export interface MessageEventFrameMessage extends FrameMessage {
  _id: "codevinci"
}
