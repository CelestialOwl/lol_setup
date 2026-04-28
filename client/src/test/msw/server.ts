import { setupServer } from "msw/node";
import { defaultRiotApiHandlers } from "@/test/msw/handlers";

export const server = setupServer(...defaultRiotApiHandlers);