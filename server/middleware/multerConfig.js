const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import the file system module

// Define the base upload directory
// This will resolve to: your_project_root/server/uploads/
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create the directory if it doesn't exist
        // It's good practice to ensure subdirectories for different types of uploads
        const postUploadsDir = path.join(UPLOAD_DIR, 'posts'); // Example: server/uploads/posts/

        fs.mkdir(postUploadsDir, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating upload directory:', err);
                return cb(err);
            }
            cb(null, postUploadsDir); // Use the full path for storing files
        });
    },
    filename: (req, file, cb) => {
        // Create a unique filename by appending timestamp and original extension
        // Example: image-1701234567890.jpg
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Configure file filter (optional, but good practice for images)
const fileFilter = (req, file, cb) => {
    // Accept only specific image mimetypes
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
        cb(null, true); // Accept file
    } else {
        // Pass an error object to reject the file
        cb(new Error('Only JPEG, PNG, or GIF image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5 MB file size limit
    }
});

module.exports = upload;