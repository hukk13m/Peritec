import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Company, User } from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { publicUser, companyPublic } from '../utils/serialize.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('A valid work email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  taxCode: z.string().optional(),
  name: z.string().min(2, 'Contact person is required'),
  email: z.string().email('A valid work email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(6, 'Phone is required'),
  position: z.string().optional(),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
    if (user.status === 'locked') throw ApiError.forbidden('Account is locked');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
    user.lastLoginAt = new Date();
    await user.save();
    const auth = publicUser(user)!;
    const token = signToken(auth);
    const company = user.companyId ? await Company.findById(user.companyId) : null;
    res.json({ token, user: auth, company: companyPublic(company) });
  })
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const exists = await User.findOne({ email });
    if (exists) throw ApiError.conflict('This email already has an account', 'EMAIL_EXISTS');

    // BR-15: new business accounts are pending verification; one account per email.
    const code = 'CUS-' + Date.now().toString().slice(-6);
    const company = await Company.create({
      code,
      name: body.companyName,
      taxCode: body.taxCode,
      contactName: body.name,
      contactEmail: email,
      contactPhone: body.phone,
      status: 'pending_verification',
    });
    const user = await User.create({
      name: body.name,
      email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: 'customer',
      companyId: company._id,
      phone: body.phone,
      position: body.position,
      status: 'active',
    });
    // BR-04: link previous guest requests submitted with the same work email.
    const { RFQ } = await import('../models/index.js');
    await RFQ.updateMany(
      { contactEmail: email, companyId: { $exists: false } },
      { $set: { companyId: company._id, customerUserId: user._id } }
    );
    await RFQ.updateMany(
      { contactEmail: email, companyId: null },
      { $set: { companyId: company._id, customerUserId: user._id } }
    );
    const auth = publicUser(user)!;
    res.status(201).json({
      token: signToken(auth),
      user: auth,
      company: companyPublic(company),
      message: 'Account created and pending verification by PERITEC sales staff.',
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const company = req.user!.companyId ? await Company.findById(req.user!.companyId) : null;
    res.json({ user: req.user, company: companyPublic(company) });
  })
);

export default router;
