require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const enterpriseRoutes = require('./routes/enterprise');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'enterprise' }));

app.use('/auth', authRoutes);
app.use('/api/enterprise', enterpriseRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NimbusCart Enterprise service running on http://localhost:${PORT}`);
});
