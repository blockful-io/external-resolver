/**
 * Script for running the server locally exposing the API
 */
import { PrismaClient } from "@prisma/client";
import {
  withGetText,
  withSetText,
  withAddr,
  withSetAddr,
  withGetSignedBalance,
} from "./handlers";
import { MongoDBRepository } from "./repositories/mongodb";
import { NewServer } from "./server";

const dbclient = new PrismaClient();
const repo = new MongoDBRepository(dbclient);

const app = NewServer(
  withSetText(repo),
  withGetText(repo),
  withAddr(repo),
  withSetAddr(repo),
  withGetSignedBalance(repo)
).makeApp("/");

app.listen(process.env.PORT || 3000, () => {
  console.log(`Gateway is running!`);
});
