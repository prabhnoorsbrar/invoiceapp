import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import routeRoutes from "./routes/routes.js";
import invoiceRoutes from "./routes/invoices.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true, maxAge: 86400 }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRoutes);
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

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status < 500 ? err.message : "Internal server error";
  res.status(status).json({ error: message });
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
