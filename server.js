const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const { check, validationResult } = require('express-validator');
const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');
dotenv.config();

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
});

// Define User model
const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'users'
});

// Define Expense model
const Expense = sequelize.define('Expense', {
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'expenses'
});

// Initialize Express app
const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
    secret: 'uwebuiwebciuwebcwecubweubweofbweofbowebfouwbfuowerb',
    resave: false,
    saveUninitialized: false,
    store: new (require('connect-session-sequelize')(session.Store))({
        db: sequelize
    }),
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Test DB Connection
sequelize.authenticate().then(() => {
    console.log('DB Server connected successfully.');
}).catch(err => {
    console.error('Error occurred while connecting to the DB server: ' + err.message);
});

// Define routes
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/register', [
    check('email').isEmail().withMessage('Provide a valid email address.'),
    check('username').isAlphanumeric().withMessage('Invalid username. Provide alphanumeric values.'),
    check('email').custom(async (value) => {
        const user = await User.findOne({ where: { email: value } });
        if (user) {
            throw new Error('Email already exists');
        }
    }),
    check('username').custom(async (value) => {
        const user = await User.findOne({ where: { username: value } });
        if (user) {
            throw new Error('Username already in use.');
        }
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    try {
        await User.create({
            email: req.body.email,
            username: req.body.username,
            password: hashedPassword
        });
        res.status(201).send('Registration successful!');
    } catch (error) {
        console.error('An error occurred while saving the record: ' + error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res.status(401).send('Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.user = user;
            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).send('Invalid email or password.');
        }
    } catch (error) {
        res.status(500).send('Server error');
    }
});

const userAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/dashboard', userAuthenticated, (req, res) => {
    res.status(200).json({ message: 'You are viewing a secured route.' });
});

app.get('/add_expense', (req, res) => {
    res.sendFile(path.join(__dirname, 'add_expense.html'));
});

app.post('/add_expense', async (req, res) => {
    const { description, amount, date, category } = req.body;

    if (!description || amount == null || !category) {
        return res.status(400).json({ message: 'Description, amount, and category are required' });
    }

    try {
        const expense = await Expense.create({
            description,
            amount,
            date,
            category
        });
        res.status(201).json(expense);
    } catch (error) {
        console.error('Error saving expense:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

app.get('/expenses', async (req, res) => {
    const { date } = req.query;

    try {
        const expenses = date ? 
            await Expense.findAll({ where: { date } }) : 
            await Expense.findAll();
        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).send('Error retrieving expenses');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error during logout');
        }
        res.redirect('/login');
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
