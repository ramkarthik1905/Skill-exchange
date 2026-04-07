require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Server status route
app.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});
app.get('/register', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});
app.get('/login', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});

// User routes
app.use('/api/users', userRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Connect to MongoDB & Start Server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        if (process.env.DB_CONNECTION) {
            await mongoose.connect(process.env.DB_CONNECTION);
            console.log('MongoDB connected');
        } else {
            console.warn('WARNING: No DB_CONNECTION found.');
        }
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Server failed to start:', error.message);
        process.exit(1);
    }
};

startServer();
