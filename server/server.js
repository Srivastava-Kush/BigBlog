/**
 * server.js — production entry point.
 *
 * All route logic lives in app.js (the testable module).
 * This file only wires up the database connection and starts the HTTP server.
 */
import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";

const PORT_NUMBER = process.env.PORT || 3000;

mongoose
  .connect(process.env.DB_LOCATION, { autoIndex: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT_NUMBER, () => {
  console.log("listening on port ->" + PORT_NUMBER);
});
