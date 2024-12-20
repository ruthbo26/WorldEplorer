const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const passport = require('./auth/passport'); // Import your passport configuration
const pool = require('./models/db'); // Your PostgreSQL connection pool
const app = express();

const port = 4000;

// Use CORS middleware to allow cross-origin requests
app.use(cors());

// Middleware to handle JSON requests
app.use(express.json());

// Middleware to handle form data
app.use(express.urlencoded({ extended: true })); 

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));  // Ensure that views folder is recognized

// Serve static files (like CSS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
    secret: 'your-secret-key', // Change this to a real secret
    resave: false,
    saveUninitialized: false,
}));

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

// Add user data to all views
app.use((req, res, next) => {
    res.locals.user = req.user; // Ensure user is available in all views
    next();
});

// Home route: Displays the search form
app.get('/', (req, res) => {
    res.render('pages/home'); // home.ejs will render
});

// Route for searching and showing country data
app.get('/country', async (req, res) => {
    const countryName = req.query.name;  // Get country name from query string

    // Ensure if country name is provided
    if (!countryName) {
        return res.status(400).send({
            message: 'Country name is required.',
            error: true,
            statusCode: 400,
            details: 'Please provide a valid country name.',
        });
    }

    try {
        // URL to fetch data for the specific country
        const url = `https://countries-api-abhishek.vercel.app/countries/${countryName.toLowerCase()}`;
        console.log(`Requesting URL: ${url}`);
        
        // Make the request to the NationNode API
        const response = await axios.get(url);

        // Check if the country data is available in the response
        if (response.data && response.data.data) {
            res.render('pages/country', { 
                countryData: response.data.data,
                countryName: countryName,
                user: req.user // Pass user data to check if the user is logged in
            });
        } else {
            return res.status(404).send({
                message: `Country '${countryName}' not found.`,
                error: true,
                statusCode: 404,
                details: `No country data found for '${countryName}'. Please check for typos or refer to the list of available countries.`,
            });
        }
    } catch (error) {
        console.error('Error fetching country data:', error.message);
        console.error('Error response:', error.response ? error.response.data : 'No response data');
        return res.status(500).send({
            message: 'Error fetching country data.',
            error: true,
            statusCode: 500,
            details: 'There was an issue while trying to retrieve the data. Please try again later.',
        });
    }
});

// Route to add country to visited list
app.post('/country/add', isAuthenticated, async (req, res) => {
    const { countryName } = req.body;

    try {
        // Insert the country into the visited countries table
        await pool.query(
            'INSERT INTO visited_countries (country_name, visited_by) VALUES ($1, $2)', 
            [countryName, req.user.id]
        );

        // Redirect the user to their profile or visited countries page
        res.redirect('/profile');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error adding visited country');
    }
});

// User Signup Route
app.get('/signup', (req, res) => {
    res.render('pages/signup');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    console.log('Signup data received:', { username, password });

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.redirect('/login');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error during sign-up');
    }
});

// User Login Route
app.get('/login', (req, res) => {
    res.render('pages/login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));

// User account Route (where users can see their visited countries)
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM visited_countries WHERE visited_by = $1', [req.user.id]);
        const visitedCountries = result.rows;
        res.render('pages/profile', { visitedCountries });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error fetching visited countries');
    }
});

// Visited Countries Route 
app.get('/visited', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM visited_countries WHERE visited_by = $1', [req.user.id]);
        const visitedCountries = result.rows;
        res.render('pages/visited', { visitedCountries });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error fetching visited countries');
    }
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Logout Route
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
