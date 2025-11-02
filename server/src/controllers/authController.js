import User from '../models/User.js';
import Company from '../models/Company.js';
import { sign } from '../utils/auth.js';
import { HttpError, asyncHandler } from '../utils/errors.js';


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
  res.json({
    token: sign(user),
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
    company: { id: company._id, name: company.name },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.verifyPassword(password)))
    throw new HttpError(401, "Invalid credentials");
  const company = await Company.findById(user.companyId);
  res.json({
    token: sign(user),
    user: {
      id: user._id,
      email,
      companyId: user.companyId,
      role: user.role,
      address: user.address,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    company: company ? { id: company._id, name: company.name } : null,
  });
});
