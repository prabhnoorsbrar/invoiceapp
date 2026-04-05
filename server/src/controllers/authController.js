import User from '../models/User.js';
import Company from '../models/Company.js';
import { sign } from '../utils/auth.js';
import { HttpError, asyncHandler } from '../utils/errors.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setAuthCookie(res, token) {
  res.cookie("jwt", token, COOKIE_OPTS);
}


export const register = asyncHandler(async (req, res) => {
  const { email, password, companyName } = req.body;
  let company;
  if (companyName) {
    company = await Company.create({ name: companyName });
  } else throw new HttpError(400, "companyName required for first admin");
  const passwordHash = await User.hash(password);
  const user = await User.create({
    email,
    passwordHash,
    companyId: company._id,
    role: "admin",
  });
  setAuthCookie(res, sign(user));
  res.json({
    user: {
      id: user._id,
      email,
      companyId: company._id,
      role: user.role,
      address: user.address,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    company: { id: company._id, name: company.name, address: company.address, phone: company.phone },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.verifyPassword(password)))
    throw new HttpError(401, "Invalid credentials");
  const company = await Company.findById(user.companyId);
  setAuthCookie(res, sign(user));
  res.json({
    user: {
      id: user._id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      address: user.address,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    company: company ? { id: company._id, name: company.name, address: company.address, phone: company.phone } : null,
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("jwt", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ ok: true });
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId)
  if (!company) throw new HttpError(404, 'Company not found')
  const { name, address, phone } = req.body
  if (name) company.name = name.trim()
  if (address !== undefined) company.address = address.trim()
  if (phone !== undefined) company.phone = phone.trim()
  await company.save()
  res.json({ company: { id: company._id, name: company.name, address: company.address, phone: company.phone } })
})

export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(404, "User not found");
  const { email, currentPassword, newPassword } = req.body;
  if (newPassword) {
    if (!currentPassword) throw new HttpError(400, "Current password required");
    if (!(await user.verifyPassword(currentPassword))) throw new HttpError(401, "Current password is incorrect");
    user.passwordHash = await User.hash(newPassword);
  }
  if (email) user.email = email.toLowerCase().trim();
  await user.save();
  const token = sign(user);
  setAuthCookie(res, token);
  res.json({ user: { id: user._id, email: user.email, companyId: user.companyId, role: user.role, firstName: user.firstName, lastName: user.lastName, phone: user.phone } });
});
