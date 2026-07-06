import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { adminInvites } from "./table/adminInvites";
import { commerces } from "./table/commerces";
import { events } from "./table/events";
import { favorites } from "./table/favorites";
import { feedback } from "./table/feedback";
import { users } from "./table/users";

export default defineSchema({
  ...authTables,
  adminInvites,
  commerces,
  events,
  favorites,
  feedback,
  users,
});
