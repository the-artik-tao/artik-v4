import { z } from "zod";

// Example entity schema for demonstration
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  plan: z.enum(["Free", "Pro", "Enterprise"]),
  mrr: z.number().nonnegative(),
  active: z.boolean(),
  lastSeen: z.string(), // ISO datetime
});

export type User = z.infer<typeof UserSchema>;
