const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { prisma } = require('./prisma');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned from Google'), null);

        // 1. Already linked via googleId → login
        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

        if (!user) {
          // 2. Email exists → link Google to the existing account
          // 3. No account → create one
          user = await prisma.user.upsert({
            where:  { email },
            update: { googleId: profile.id },
            create: {
              email,
              googleId: profile.id,
              name: profile.displayName || email.split('@')[0],
            },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
