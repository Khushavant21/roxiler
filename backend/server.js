const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const Transaction = require('./models/Transaction');

const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/transactions', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// API to initialize the database
app.get('/api/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        await Transaction.deleteMany({});
        await Transaction.insertMany(transactions);

        res.status(200).json({ message: 'Database initialized with seed data' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API to list all transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
    const { month, search, page = 1, perPage = 10 } = req.query;
    const regex = new RegExp(search, 'i');
    const startDate = new Date(`2021-${month}-01`);
    const endDate = new Date(`2021-${month}-31`);

    const filter = {
        dateOfSale: { $gte: startDate, $lt: endDate },
        $or: [
            { title: regex },
            { description: regex },
            { price: { $regex: regex } },
        ],
    };

    try {
        const transactions = await Transaction.find(filter)
            .skip((page - 1) * perPage)
            .limit(Number(perPage));

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API for statistics
app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2021-${month}-01`);
    const endDate = new Date(`2021-${month}-31`);

    try {
        const totalSaleAmount = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]);

        const totalSoldItems = await Transaction.countDocuments({
            dateOfSale: { $gte: startDate, $lt: endDate },
            sold: true,
        });

        const totalNotSoldItems = await Transaction.countDocuments({
            dateOfSale: { $gte: startDate, $lt: endDate },
            sold: false,
        });

        res.status(200).json({
            totalSaleAmount: totalSaleAmount[0] ? totalSaleAmount[0].total : 0,
            totalSoldItems,
            totalNotSoldItems,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API for bar chart data
app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2021-${month}-01`);
    const endDate = new Date(`2021-${month}-31`);

    try {
        const priceRanges = [
            { range: '0-100', min: 0, max: 100 },
            { range: '101-200', min: 101, max: 200 },
            { range: '201-300', min: 201, max: 300 },
            { range: '301-400', min: 301, max: 400 },
            { range: '401-500', min: 401, max: 500 },
            { range: '501-600', min: 501, max: 600 },
            { range: '601-700', min: 601, max: 700 },
            { range: '701-800', min: 701, max: 800 },
            { range: '801-900', min: 801, max: 900 },
            { range: '901-above', min: 901, max: Infinity },
        ];

        const barChartData = await Promise.all(
            priceRanges.map(async (range) => {
                const count = await Transaction.countDocuments({
                    dateOfSale: { $gte: startDate, $lt: endDate },
                    price: { $gte: range.min, $lte: range.max },
                });

                return { range: range.range, count };
            })
        );

        res.status(200).json(barChartData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API for pie chart data
app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2021-${month}-01`);
    const endDate = new Date(`2021-${month}-31`);

    try {
        const pieChartData = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        res.status(200).json(pieChartData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API to combine all data
app.get('/api/combined', async (req, res) => {
    const { month } = req.query;

    try {
        const [transactions, statistics, barChart, pieChart] = await Promise.all([
            Transaction.find({ dateOfSale: { $gte: new Date(`2021-${month}-01`), $lt: new Date(`2021-${month}-31`) } }),
            Transaction.aggregate([
                { $match: { dateOfSale: { $gte: new Date(`2021-${month}-01`), $lt: new Date(`2021-${month}-31`) } } },
                { $group: { _id: null, total: { $sum: '$price' }, sold: { $sum: { $cond: ['$sold', 1, 0] } }, notSold: { $sum: { $cond: ['$sold', 0, 1] } } } },
            ]),
            Transaction.aggregate([
                { $match: { dateOfSale: { $gte: new Date(`2021-${month}-01`), $lt: new Date(`2021-${month}-31`) } } },
                { $bucket: { groupBy: '$price', boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity], default: 'Other', output: { count: { $sum: 1 } } } },
            ]),
            Transaction.aggregate([
                { $match: { dateOfSale: { $gte: new Date(`2021-${month}-01`), $lt: new Date(`2021-${month}-31`) } } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
            ]),
        ]);

        res.status(200).json({
            transactions,
            statistics: statistics[0],
            barChart,
            pieChart,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
