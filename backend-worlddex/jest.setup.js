require('dotenv').config();

// Set default test environment variables if not provided
process.env.AWS_REGION = process.env.AWS_REGION;
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;