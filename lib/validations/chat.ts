import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.record(z.unknown()).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
