const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// Handle incoming file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Assuming the phone numbers are in a column named "Phone"
  const phoneNumbers = data.map((row) => row.Phone);

  // Use Twilio to send messages to the phone numbers
  const client = twilio('YOUR_TWILIO_ACCOUNT_SID', 'YOUR_TWILIO_AUTH_TOKEN');
  
  phoneNumbers.forEach((phoneNumber) => {
    client.messages
      .create({
        body: 'Your message goes here',
        from: process.env.YOUR_TWILIO_PHONE_NUMBER,
        to: phoneNumber
      })
      .then((message) => console.log(`Message sent to ${message.to}`))
      .catch((error) => console.error(error));
  });

  res.json({ success: true });
});

// Replace this with your own secret key for JWT
const JWT_SECRET = 'your_secret_key';

// Mock database (replace this with an actual database implementation)
const users = [];

// Registration endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Check if the email is already registered
  if (users.find((user) => user.email === email)) {
    return res.status(400).json({ error: 'Email is already registered' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user object
    const user = { email, password: hashedPassword };

    // Store the user in the database
    users.push(user);

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// Authorization endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Find the user in the database
  const user = users.find((user) => user.email === email);

  // Check if the user exists
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  try {
    // Check if the password is correct
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate a JWT token
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during authorization' });
  }
});

// Protected endpoint
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'You have access to the protected resource' });
});

// Middleware to authenticate the JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    next();
  });
}
//done

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
