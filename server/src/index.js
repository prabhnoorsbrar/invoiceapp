import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import routeRoutes from "./routes/routes.js";
import invoiceRoutes from "./routes/invoices.js";

const app = express();
app.use(cors());
app.use(express.json());
//app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/invoices", invoiceRoutes);

const PORT = process.env.PORT;
mongoose
  .connect(process.env.MONGO_URI, { dbName: 'invoicing' })
  .then(() => {
    console.log('✅ Mongo connected successfully')
    app.listen(PORT,() =>
      console.log(`🚀 API running at http://localhost:${PORT}`)
    )
  })
  .catch((err) => {
    console.error('❌ Mongo connection error:', err.message)
  });

// ---- server/src/utils/errors.js ----
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
