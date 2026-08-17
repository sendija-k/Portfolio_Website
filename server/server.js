require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs').promises;
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 2000;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    console.error('ERROR: SESSION_SECRET must be set in .env');
    process.exit(1);
}

// Session configuration
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: false // Set to true if using HTTPS
    }
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from parent directory (Portfolio root).
// Use no-cache so browsers (and Cloudflare) revalidate via ETag and pick up
// deploys immediately — the site has no asset-versioning build step, so a long
// cache would otherwise serve stale JS/CSS for hours after a change.
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache');
    }
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized' });
}

// API endpoint to fetch markdown from GitHub
app.get('/api/markdown', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.json({ success: false, error: 'URL parameter is required' });
    }

    https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            if (response.statusCode === 200) {
                res.json({ success: true, content: data });
            } else {
                res.json({ success: false, error: 'Failed to fetch markdown: ${response.statusCode}' });
            }
        });
    }).on('error', (error) => {
        res.json({ success: false, error: error.message });
    });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// API endpoint to save projects data (protected)
app.post('/api/projects', requireAuth, async (req, res) => {
    try {
        const projectsData = req.body;
        const filePath = path.join(__dirname, '..', 'data', 'projects.json');

        // Write to file with pretty formatting
        await fs.writeFile(filePath, JSON.stringify(projectsData, null, 2), 'utf8');

        res.json({ success: true, message: 'Projects saved successfully' });
    } catch (error) {
        console.error('Error saving projects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to save home data (protected)
app.post('/api/home', requireAuth, async (req, res) => {
    try {
        const homeData = req.body;
        const filePath = path.join(__dirname, '..', 'data', 'home-data.json');

        // Write to file with pretty formatting
        await fs.writeFile(filePath, JSON.stringify(homeData, null, 2), 'utf8');

        res.json({ success: true, message: 'Home data saved successfully' });
    } catch (error) {
        console.error('Error saving home data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to save blog data (protected)
app.post('/api/blog', requireAuth, async (req, res) => {
    try {
        const blogData = req.body;
        const filePath = path.join(__dirname, '..', 'data', 'blog-data.json');

        // Write to file with pretty formatting
        await fs.writeFile(filePath, JSON.stringify(blogData, null, 2), 'utf8');

        res.json({ success: true, message: 'Blog data saved successfully' });
    } catch (error) {
        console.error('Error saving blog data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to save the course plan (protected)
app.post('/api/course-plan', requireAuth, async (req, res) => {
    try {
        const coursePlanData = req.body;
        const filePath = path.join(__dirname, '..', 'data', 'course-plan.json');

        await fs.writeFile(filePath, JSON.stringify(coursePlanData, null, 2), 'utf8');

        res.json({ success: true, message: 'Course plan saved successfully' });
    } catch (error) {
        console.error('Error saving course plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to save the course catalog (protected)
app.post('/api/course-catalog', requireAuth, async (req, res) => {
    try {
        const courseCatalogData = req.body;
        const filePath = path.join(__dirname, '..', 'data', 'courses.json');

        await fs.writeFile(filePath, JSON.stringify(courseCatalogData, null, 2), 'utf8');

        res.json({ success: true, message: 'Course catalog saved successfully' });
    } catch (error) {
        console.error('Error saving course catalog:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Route for the blog page (hidden, accessible only when logged in)
app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Route for the course planner page (hidden, accessible only when logged in)
app.get('/course', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});