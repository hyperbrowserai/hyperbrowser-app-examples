export type RunStatus = "completed" | "failed" | "cancelled" | "stopped";

export type RunStreamEvent =
  | {
      type: "liveUrl";
      liveUrl: string;
    }
  | {
      type: "step";
      count: number;
    }
  | {
      type: "done";
      status: RunStatus;
      output: string;
      steps: number;
    }
  | {
      type: "error";
      message: string;
    };
