const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

let pendingImages = [];
let approvedImages = [];

// Serve static files
app.use(express.static('z:/BELL LABS'));

// Handle image uploads
app.post('/api/upload', upload.single('image'), (req, res) => {
    const image = {
        id: Date.now(),
        path: req.file.path,
        previewUrl: `/uploads/${req.file.filename}`,
    };
    pendingImages.push(image);
    res.sendStatus(200);
});

// Get pending images
app.get('/api/pending-images', (req, res) => {
    res.json(pendingImages);
});

// Approve an image
app.post('/api/approve-image/:id', async (req, res) => {
    const imageId = parseInt(req.params.id, 10);
    const image = pendingImages.find((img) => img.id === imageId);

    if (image) {
        // Simulate moving the image to a public directory
        const publicPath = path.join(__dirname, 'public', `${imageId}.jpg`);
        await sharp(image.path)
            .resize(800)
            .jpeg({ quality: 80 })
            .toFile(publicPath);

        approvedImages.push({ id: imageId, path: publicPath });
        pendingImages = pendingImages.filter((img) => img.id !== imageId);
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Serve approved images
app.use('/approved', express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
