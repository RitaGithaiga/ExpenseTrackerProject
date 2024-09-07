const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const RedisStore = require('connect-redis').default;

const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const { check, validationResult } = require('express-validator');
const dotenv = require('dotenv');
dotenv.config();
const redisClient = require('redis').createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});


//initialize
const app = express();

//configure - middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
    store: new RedisStore({client: redisClient}),
    secret: process.env.SESSION_SECRET || 'uwebuiwebciuwebcwecubweubweofbweofbowebfouwbfuowerb',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
     } 
}));

//create connection
const connection  = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME

});

connection.connect((err) => {
    if(err){
        console.error('Error occured while connecting to the db server: ' + err.stack);
        return;
    }
    console.log('DB Server connected successfully.');
});

//define route to registration form
app.get('/register', (request, response) => {
    response.sendFile(path.join(__dirname, 'register.html'));
});

//display login page
app.get('/login', (request, response) => {
    response.sendFile(path.join(__dirname, "login.html"));
});

//define a User object - registration
const User = {
    tableName: 'users',
    createUser: function(newUser, callback){
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },
    getUserByEmail: function(email, callback){
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function(username, callback){
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    },
}

//define registration route and logic
app.post('/register', [
    //validation check
    check('email').isEmail().withMessage('Provide valid email address.'),
    check('username').isAlphanumeric().withMessage('Invalid username. Provide aplhanumeric values.'),

    check('email').custom( async(value) => {
        const exist = await User.getUserByEmail(value);
        if(exist){
            throw new Error('Email already exists');
        }
    }),
    check('username').custom( async(value) => {
        const exist = await User.getUserByUsername(value);
        if(exist){
            throw new Error('Username already in use.');
        }
    })
], async (request, response) => {
    //check for validation
    const errors = validationResult(request);
    if(!errors.isEmpty()){
        return response.status(400).json({ errors: errors.array() });
    }

    //hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);

    //define a new user object
    const newUser = {
        email: request.body.email,
        username: request.body.username,
        password: hashedPassword
    }

    //save new user
    User.createUser(newUser, (error) => {
        if(error){
            console.error('An error occurred while saving the record: ' + error.message);
            return response.status(500).json({ error: error.message });
        }
        console.log('New user record saved!');
        response.status(201).send('Registration successful!');
    });

});

//handle the login logic - authentication
app.post('/login', (request, response) => {
    const { email, password } = request.body;

    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if(err) return response.status(500).send('Server error');
        if(results.length === 0) {
            response.status(401).send('Invalid email or password.');
        } else {
            const user = results[0];
            //compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if(err)return response.status(500).send('Server error');
                if(isMatch){
                    //storing user data to the session variable
                    request.session.user = user;
                    response.status(200).json({ message: 'Login successful' });
                } else {
                    response.status(401).send('Invalid username or password.');
                }
            }); 
        }
    });
});

//handle authorization
const userAuthenticated = (request, response, next) => {
    if(request.session.user){
        next();
    } else {
        response.redirect('/login');
    }
}

//secure route
app.get('/dashboard', userAuthenticated, (request, response) => {
    response.status(200).json({ message: 'You are viewing a secured route.'});
});

//adding an expense
app.get('/add_expense', (request, response) => {
    response.sendFile(path.join(__dirname, "add_expense.html"));
});

app.post('/add_expense', async (req, res) => {
    const { description, amount, date, category } = req.body;
  
    if (!description || amount == null || !category) {
      return res.status(400).json({ message: 'Description, amount, and category are required' });
    }
  
    const query = 'INSERT INTO expenses (description, amount, date, category) VALUES (?, ?, ?, ?)';
    const values = [description, amount, date, category];
  
    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Error saving expense:', error);
            return res.status(500).json({ message: 'Server error', error });
        }
        res.status(201).json({ id: results.insertId, description, amount, date, category });
    });
  });
  

//retrieving and displaying expenses
app.get('/expenses', (req, res) => {
    const { date } = req.query;

    let sql = 'SELECT * FROM expenses';
    const params = [];

    if (date) {
        sql += ' WHERE date = ?';
        params.push(date);
    }

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching expenses:', err);
            return res.status(500).send('Error retrieving expenses');
        }
        res.json(results);
    });
});


//destroy session
app.get('/logout', (request, response) => {
    request.session.destroy(err => {
        if (err) {
            return response.status(500).send('Error during logout');
        }
        response.redirect('/login');
    });
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
