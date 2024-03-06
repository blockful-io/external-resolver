/**
 * Script for running the server locally exposing the API
 */
import {
  withGetText,
  withSetText,
  withAddr,
  withSetAddr,
  withGetSignedBalance,
} from "./handlers";
import { MongoDBRepository } from "./repositories/mongodb";
import { NewServer } from "./server";

const repo = new MongoDBRepository();

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
