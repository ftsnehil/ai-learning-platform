import { not } from "drizzle-orm";
import { boolean } from "drizzle-orm/gel-core";
import { integer, json, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  subscriptionID: varchar()
});


export const coursesTable=pgTable("courses",{
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  cid:varchar().notNull(),
  name:varchar(),
  Description:varchar(),
  duration:varchar(),
  noOfChapters:integer().notNull(),
  includeVideo:boolean().default(false),
  level:varchar().notNull(),
  catetgory:varchar(),
  courseJson:json(),
  bannerImageUrl:varchar().default(''),
  userEmail:varchar('userEmail').references(()=>usersTable.email).notNull()
})