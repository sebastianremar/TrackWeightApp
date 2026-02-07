const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'sara-peso-secret-key';
const TABLE_NAME = 'Pesos';

// DynamoDB setup (uses IAM role on EC2, or local AWS credentials)
const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'front')));

// Log every request to the terminal
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    console.log('Signup request:', { name, email });

    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store in DynamoDB (ConditionExpression prevents duplicates atomically)
    const user = {
        email,
        name,
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };

    try {
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: user,
            ConditionExpression: 'attribute_not_exists(email)'
        }));
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }
        console.error('DynamoDB PutItem error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Generate token
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { name: user.name, email: user.email }
    });
});

// POST /api/signin
app.post('/api/signin', async (request, response) => {
    const { email, password } = request.body;

    // Validate required fields
    if (!email || !password) {
        return response.status(400).json({ error: 'Email and password are required' });
    }

    // Find user in DynamoDB
    let result;
    try {
        result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { email }
        }));
    } catch (err) {
        console.error('DynamoDB GetItem error:', err);
        return response.status(500).json({ error: 'Internal server error' });
    }

    const user = result.Item;
    if (!user) {
        return response.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return response.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    response.json({
        message: 'Signed in successfully',
        token,
        user: { name: user.name, email: user.email }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
