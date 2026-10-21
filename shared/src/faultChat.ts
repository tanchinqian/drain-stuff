import { z } from "zod";

export const faultChatInput = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(6000),
          })
          .strict(),
      )
      .min(1)
      .max(11),
    assetId: z.string().max(120).optional(),
    faultId: z.string().max(120).optional(),
    partId: z.string().max(120).optional(),
    diagnosisId: z.string().max(120).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      input.messages.at(-1)?.role !== "user" ||
      input.messages.some(
        (message, i) => message.role !== (i % 2 ? "assistant" : "user"),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Send alternating chat messages ending with a question",
      });
    if (
      input.messages.some(
        (message) => message.role === "user" && message.content.length > 2000,
      ) ||
      input.messages.reduce((sum, message) => sum + message.content.length, 0) >
        18000
    )
      ctx.addIssue({
        code: "custom",
        message: "Shorten the conversation or start a new chat",
      });
  });
export type FaultChatInput = z.infer<typeof faultChatInput>;
export interface FaultChatSource {
  id: string;
  label: string;
  kind: "fault" | "sensor" | "rule" | "case" | "guidance";
}
export interface FaultChatAnswer {
  answer: string;
  sources: FaultChatSource[];
  model: string;
  contextAt: string;
  context: {
    faults: number;
    sensors: number;
    detailedSensors: number;
    assetId?: string;
  };
}
export interface FaultChatStatus {
  available: boolean;
  model: string;
  message?: string;
}
