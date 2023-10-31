const mongoose = require('mongoose');

const dbConnect = () => {
    const atlasConnectionUri = 'mongodb+srv://mohan_ram7603:Mohan123@cluster0.k3onnrf.mongodb.net/hms?retryWrites=true&w=majority';

    mongoose.connect(atlasConnectionUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const db = mongoose.connection;

    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    db.once('open', () => {
        console.log('Connected to MongoDB Atlas');
    });
};

module.exports = dbConnect;
