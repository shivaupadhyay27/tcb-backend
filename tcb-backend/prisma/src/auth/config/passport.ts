import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateGoogleUser } from '../services/auth.service';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value;

        if (!email) return done(new Error('No email returned from Google'), undefined);

        const tokens = await findOrCreateGoogleUser({
          id: profile.id,
          email,
          name: profile.displayName,
          avatarUrl,
        });

        return done(null, tokens as unknown as Express.User);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
