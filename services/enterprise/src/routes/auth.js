const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.get('/google', (req, res, next) => {
  console.log('[Auth] /auth/google hit — initiating OAuth flow');
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  (req, res, next) => {
    console.log('[Auth] /auth/google/callback hit — code present:', !!req.query.code);
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    })(req, res, (err) => {
      if (err) {
        console.error('[Auth] Passport authenticate error:', err.message || err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_error`);
      }
      next();
    });
  },
  (req, res) => {
    console.log('[Auth] OAuth success — user:', req.user?.id, req.user?.email);
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        role: req.user.role || 'customer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const redirectUrl = `${process.env.FRONTEND_URL}?token=${token}`;
    console.log('[Auth] Redirecting to:', redirectUrl.substring(0, 80) + '...');
    res.redirect(redirectUrl);
  }
);

router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.json({ success: true });
  });
});

router.get('/me', verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    avatar: req.user.avatar,
    role: req.user.role || 'customer',
  });
});

module.exports = router;
