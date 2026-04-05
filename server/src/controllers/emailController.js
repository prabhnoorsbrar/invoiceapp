import nodemailer from 'nodemailer'
import Invoice from '../models/Invoice.js'
import { asyncHandler, HttpError } from '../utils/errors.js'

function makeTransport() {
  return nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { ciphers: 'SSLv3' },
  })
}

export const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const { companyId } = req.user
  const { id } = req.params

  const invoice = await Invoice.findOne({ _id: id, companyId })
    .populate({ path: 'clientId', select: 'name emailTo cc' })
    .lean()
  if (!invoice) throw new HttpError(404, 'Invoice not found')

  const { to, cc, subject, body, invoicePdf } = req.body
  if (!to) throw new HttpError(400, 'Recipient (to) is required')
  if (!subject) throw new HttpError(400, 'Subject is required')

  const toList = Array.isArray(to) ? to : [to]
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]) : []

  const attachments = []

  // Invoice PDF (base64 from client)
  if (invoicePdf) {
    const base64 = invoicePdf.replace(/^data:application\/pdf;base64,/, '')
    attachments.push({
      filename: `Invoice ${invoice.invoiceNumber}.pdf`,
      content: Buffer.from(base64, 'base64'),
      contentType: 'application/pdf',
    })
  }

  // Additional uploaded files
  for (const file of req.files || []) {
    attachments.push({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    })
  }

  const transport = makeTransport()

  await transport.sendMail({
    from: `"Kawaljit Brar" <${process.env.SMTP_USER}>`,
    to: toList.join(', '),
    cc: ccList.length ? ccList.join(', ') : undefined,
    subject,
    text: body,
    attachments,
  })

  res.json({ ok: true })
})
