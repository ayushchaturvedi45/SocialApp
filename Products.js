  const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');

        // Create the upload directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        cb(null, uploadDir); // Specify upload directory
    },
    filename: (req, file, cb) => {
        // Generate unique filename using current timestamp
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// API to add a product with image
router.post('/addproduct', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, tags } = req.body;

        // Check if required fields are present
        if (!name || !description || !price || !tags || !req.file) {
            return res.status(400).json({ message: "All fields and an image are required" });
        }

        // Save product details and image path
        const product = new Product({
            name,
            description,
            price,
            tags,
            image: `/uploads/${req.file.filename}` // Store relative path of uploaded image
        });

        const savedProduct = await product.save();
        res.status(201).json({
            message: "Product added successfully",
            product: savedProduct
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

router.get('/getproducts', async (req, res) => {
  try {
      const products = await Product.find(); // Fetch all products from the database

      if (!products || products.length === 0) {
          return res.status(404).json({ message: "No products found" });
      }

      res.status(200).json({
          products: products // Send the list of products in the response
      });
  } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
  }
});

// API to delete a product by ID
router.delete('/deleteproduct/:id', async (req, res) => {
  try {
      const { id } = req.params;

      // Find the product by ID
      const product = await Product.findById(id);

      if (!product) {
          return res.status(404).json({ message: "Product not found" });
      }

      // Remove the image file from the server if it exists
      const imagePath = path.join(__dirname, '../uploads', path.basename(product.image));
      
      // Check if the file exists before deleting
      if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath); // Delete the image file
      }

      // Delete the product from the database
      await Product.findByIdAndDelete(id);

      res.status(200).json({
          message: "Product and its image deleted successfully"
      });
  } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
  }
});

router.put('/updateproduct/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, tags } = req.body;

        // Find the product by ID
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // If a new image is uploaded, delete the old image
        if (req.file) {
            const oldImagePath = path.join(__dirname, '../uploads', path.basename(product.image));
            
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath); // Delete the old image file
            }

            // Update the product's image path
            product.image = `/uploads/${req.file.filename}`;
        }

        // Update other product details if provided
        if (name) product.name = name;
        if (description) product.description = description;
        if (price) product.price = price;
        if (tags) product.tags = tags;

        // Save the updated product
        const updatedProduct = await product.save();

        res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
