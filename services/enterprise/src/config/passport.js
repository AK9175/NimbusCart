const passport = require('passport');
const pool = require('./db');

// Only register Google strategy when OAuth credentials are present.
// passport-oauth2 (the base class) throws a TypeError at construction time
// if clientID is falsy — crashing the server before it can serve /health.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id, displayName, emails, photos } = profile;
          const email = emails[0].value;
          const avatar = photos[0]?.value || null;
          console.log('[OAuth] Verify callback — google_id:', id, 'email:', email);

          const result = await pool.query(
            `INSERT INTO users (google_id, email, name, avatar)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (google_id)
             DO UPDATE SET email = $2, name = $3, avatar = $4
             RETURNING *`,
            [id, email, displayName, avatar]
          );

          console.log('[OAuth] User upserted — id:', result.rows[0].id, 'role:', result.rows[0].role);
          return done(null, result.rows[0]);
        } catch (err) {
          console.error('[OAuth] Verify callback DB error:', err.message);
          return done(null, false, { message: err.message });
        }
      }
    )
  );
} else {
  console.warn('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled');
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
