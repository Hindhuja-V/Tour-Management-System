const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Override local router DNS with Google DNS

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 1. Connect to MongoDB Atlas Cloud & Seed Initial Tours
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { family: 4 })
    .then(async () => {
        console.log('Connected successfully to MongoDB Atlas Cloud!');
        await seedInitialTours(); // Auto-seeds database if empty
    })
    .catch(err => console.error('MongoDB Atlas Connection Error:', err));

// 2. Define Mongoose Schemas & Models

// --- Tour Schema & Model ---
const tourSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: String, required: true },
    image: { type: String, required: true }
});

const Tour = mongoose.model('Tour', tourSchema);

// --- Booking Schema & Model ---
const bookingSchema = new mongoose.Schema({
    tourName: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    guests: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Helper function to seed default 9 tours into MongoDB Atlas
async function seedInitialTours() {
    try {
        const count = await Tour.countDocuments();
        if (count < 9) {
            await Tour.deleteMany({});
            const initialTours = [
                {
                    name: "Santorini Sunset & Wine Tour",
                    location: "Oia, Greece",
                    price: 1250,
                    duration: "5 Days",
                    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Swiss Alps Helicopter & Ski",
                    location: "Zermatt, Switzerland",
                    price: 2400,
                    duration: "7 Days",
                    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Kyoto Bamboo & Temple Walk",
                    location: "Kyoto, Japan",
                    price: 980,
                    duration: "4 Days",
                    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Bali Luxury Villa & Safari",
                    location: "Ubud, Indonesia",
                    price: 850,
                    duration: "6 Days",
                    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Amalfi Coast Private Yacht",
                    location: "Positano, Italy",
                    price: 1800,
                    duration: "5 Days",
                    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Maui Luxury Beach Resort",
                    location: "Hawaii, USA",
                    price: 2100,
                    duration: "6 Days",
                    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Paris Riviera & Cultural Tour",
                    location: "Paris, France",
                    price: 1450,
                    duration: "5 Days",
                    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Banff Lakes & Glacier Hike",
                    location: "Alberta, Canada",
                    price: 1150,
                    duration: "5 Days",
                    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
                },
                {
                    name: "Cairo Pyramids & Nile Cruise",
                    location: "Giza, Egypt",
                    price: 950,
                    duration: "6 Days",
                    image: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80"
                }
            ];
            await Tour.insertMany(initialTours);
            console.log('Successfully re-seeded 9 initial tours to MongoDB Atlas!');
        }
    } catch (err) {
        console.error('Error seeding initial tours:', err);
    }
}

// --- TOUR ROUTES ---

// Unified GET /api/tours endpoint with search, price filtering, and sorting
app.get('/api/tours', async (req, res) => {
    try {
        const { search, maxPrice, sort } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        if (maxPrice && !isNaN(maxPrice)) {
            query.price = { $lte: Number(maxPrice) };
        }

        let toursQuery = Tour.find(query);

        if (sort === 'price-asc') {
            toursQuery = toursQuery.sort({ price: 1 });
        } else if (sort === 'price-desc') {
            toursQuery = toursQuery.sort({ price: -1 });
        }

        const tours = await toursQuery;

        const formattedTours = tours.map(t => ({
            id: t._id,
            name: t.name,
            location: t.location,
            price: t.price,
            duration: t.duration,
            image: t.image
        }));

        res.json(formattedTours);
    } catch (err) {
        console.error('Error fetching tours:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

app.post('/api/tours', async (req, res) => {
    const { name, location, price, duration, image } = req.body;
    if (!name || !location || !price || !duration || !image) {
        return res.status(400).json({ success: false, message: 'All tour fields are required.' });
    }
    try {
        const newTour = new Tour({ name, location, price: Number(price), duration, image });
        await newTour.save();
        res.status(201).json({ 
            success: true, 
            tour: {
                id: newTour._id,
                name: newTour.name,
                location: newTour.location,
                price: newTour.price,
                duration: newTour.duration,
                image: newTour.image
            }
        });
    } catch (err) {
        console.error('Error adding tour:', err);
        res.status(500).json({ success: false, message: 'Failed to create tour.' });
    }
});

app.delete('/api/tours/:id', async (req, res) => {
    try {
        const deletedTour = await Tour.findByIdAndDelete(req.params.id);
        if (!deletedTour) {
            return res.status(404).json({ success: false, message: 'Tour not found.' });
        }
        res.status(200).json({ success: true, message: 'Tour deleted successfully.' });
    } catch (err) {
        console.error('Error deleting tour:', err);
        res.status(500).json({ success: false, message: 'Database deletion failed.' });
    }
});

// --- BOOKING ROUTES ---

// GET /api/bookings - Fetch all bookings for the dashboard
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        const formattedBookings = bookings.map(b => ({
            id: b._id,
            tourName: b.tourName,
            name: b.name,
            email: b.email,
            date: b.date,
            guests: b.guests,
            createdAt: b.createdAt
        }));
        res.json(formattedBookings);
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { tourName, name, email, date, guests } = req.body;

    if (!tourName || !name || !email || !date) {
        return res.status(400).json({
            success: false,
            message: 'Missing required booking details.'
        });
    }

    try {
        const newBooking = new Booking({
            tourName,
            name,
            email,
            date,
            guests: parseInt(guests, 10) || 1
        });

        await newBooking.save();

        res.status(200).json({
            success: true,
            message: `Booking confirmed for ${name} on ${tourName}!`
        });
    } catch (err) {
        console.error('Error saving booking:', err);
        res.status(500).json({ success: false, message: 'Database save failed.' });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const deletedBooking = await Booking.findByIdAndDelete(req.params.id);

        if (!deletedBooking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        res.status(200).json({ success: true, message: 'Booking deleted successfully.' });
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ success: false, message: 'Database deletion failed.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});