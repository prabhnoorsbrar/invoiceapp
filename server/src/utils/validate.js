import { z } from "zod";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const schemas = {
  login: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password required"),
  }),

  register: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    companyName: z.string().min(1, "Company name required"),
  }),

  createInvoice: z.object({
    clientId: objectId,
    routeId: objectId.optional(),
    invoiceDate: z.string().datetime({ offset: true }).or(z.string().date()),
    description: z.string().min(1).max(500).optional(),
    amountCents: z.number().int().positive().optional(),
    loadRef: z.string().max(100).optional(),
    invoiceNumber: z.string().max(50).optional(),
    status: z.enum(["outstanding", "paid"]).optional(),
    lineItems: z.array(
      z.object({
        id: z.string().optional(),
        description: z.string().max(500).optional(),
        amountCents: z.number().int().optional(),
        isPrimary: z.boolean().optional(),
      })
    ).optional(),
  }),

  markPaid: z.object({
    paidDate: z.string().datetime({ offset: true }).or(z.string().date()),
    paymentMethod: z.string().max(50).optional(),
    paymentRef: z.string().max(100).optional(),
  }),

  createClient: z.object({
    name: z.string().min(1, "Name required").max(200),
    emailTo: z.array(z.string().email()).optional().default([]),
    cc: z.array(z.string().email()).optional().default([]),
    address: z.string().max(500).optional(),
    paymentTermsDays: z.number().int().min(0).max(365).optional().default(30),
    showDueDate: z.boolean().optional().default(true),
  }),

  updateClient: z.object({
    name: z.string().min(1).max(200).optional(),
    emailTo: z.array(z.string().email()).optional(),
    cc: z.array(z.string().email()).optional(),
    address: z.string().max(500).optional(),
    paymentTermsDays: z.number().int().min(0).max(365).optional(),
    showDueDate: z.boolean().optional(),
  }),

  updateMe: z.object({
    email: z.string().email().optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).optional(),
  }),

  updateCompany: z.object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(50).optional(),
  }),

  updateInvoice: z.object({
    invoiceNumber: z.string().max(50).optional(),
    invoiceDate: z.string().optional(),
    description: z.string().min(1).max(500).optional(),
    amountCents: z.number().int().positive().optional(),
    loadRef: z.string().max(100).optional().nullable(),
    lineItems: z.array(z.object({
      id: z.string().optional(),
      description: z.string().max(500).optional(),
      amountCents: z.number().int().optional(),
      isPrimary: z.boolean().optional(),
    })).optional(),
  }),

  createRoute: z.object({
    clientId: objectId,
    name: z.string().min(1, "Name required").max(200),
    descriptionTemplate: z.string().max(500).optional(),
    pickupCity: z.string().max(100).optional(),
    deliveryCity: z.string().max(100).optional(),
    baseAmountCents: z.number().int().positive("Amount must be positive"),
    effectiveFrom: z.string().optional(),
  }),

  updatePrice: z.object({
    newAmountCents: z.number().int().positive("Amount must be positive"),
    effectiveFrom: z.string().optional(),
  }),
};
