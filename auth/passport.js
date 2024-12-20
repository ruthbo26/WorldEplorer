const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('../models/db');

// Passport configuration for user authentication
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      // Query the database to find the user by username
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

      if (result.rows.length === 0) {
        return done(null, false, { message: 'Incorrect username or password' });
      }

      const user = result.rows[0];

      // Compare the entered password with the hashed password stored in the database
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect username or password' });
      }
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user information to store in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user information from session
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
