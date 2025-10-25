import jwt from "jsonwebtoken";
export function sign(user) {
  return jwt.sign(
    { uid: user._id, companyId: user.companyId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
