const express = require("express");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const router = express.Router();
const JWT_SECRET = 'jai-mata-di';
const nodemailer = require('nodemailer');
const crypto = require('crypto');
var fetchuser = require('../middleware/fetchuser');


// ROUTE 1: Authenticate a User using: POST "/api/auth/signup".
router.post('/signup', [
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() }); // Return validation errors with status code
    }

    try {
        // Checking whether a user with the provided email is already exists
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            return await res.status(400).json({ message: "Sorry, a user with this email already exists" }); // No status code, only error message
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        // If no user exists, creating a new user
        user = await User.create({
            name: req.body.name,
            username: req.body.username,
            password: secPass,
            email: req.body.email,
        });

        const data = {user:{id: user.id}}
        const authtoken = jwt.sign(data, JWT_SECRET);

        // Backend response
        res.status(200).json({userId: user.id, authtoken: authtoken });
        console.log(user.id,user)

    } catch (error) {
        console.error(error.message);
        res.json({ error: "Some error occurred", message: error.message }); // Send error message without status code
    }
});

// ROUTE 2: Authenticate a User using: POST "/api/auth/login". No login required
router.post('/signin', [ 
    body('email', 'Enter a valid email').isEmail(), 
    body('password', 'Password cannot be blank').exists(), 
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() }); // Return validation errors with status code
    }

    const { email, password } = req.body;

    try {
        // Check if the user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: "Please try to login with correct credentials" }); // No status code, just error
        }

        // Compare passwords
        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({ message: "Please try to login with correct credentials" });
        }

        // Create JWT token payload
        const data = {
            user: {
                id: user.id
            }
        };

        // Sign the token
        const authtoken = jwt.sign(data, JWT_SECRET);

        // Send the auth token as the response
        res.json({ authtoken });

    } catch (error) {
        // Log the error and return it in the response without status code
        console.error(error.message);
        res.json({ error: "An error occurred", message: error.message }); // Return error message
    }
});

// ROUTE 3: Get loggedin User Details using: POST "/api/auth/getuser". Login required
router.post('/getuser', fetchuser,  async (req, res) => {
    try {
      userId = req.user.id;
      const user = await User.findById(userId).select("-password")
      res.send(user)
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
})

// ROUTE 4: POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "No user found with this email" });
        }

        const secret = JWT_SECRET + user.password;
        const token = jwt.sign({ email: user.email, id: user._id }, secret, {
        expiresIn: "5m",});

        const link = `http://localhost:5173/reset-password/${user._id}/${token}`;

        var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
        user: "ayushji456789@gmail.com",
        pass: "dfvenaczjkwaxikj"},});

        var mailOptions = {
            from: "ayushsidhuu@gmail.com",
            to: "ayushji456789@gmail.com",
            subject: "Password Reset",
            text: link,
          };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log("Email sent: " + info.response);
            }
          });
        console.log(link);
    } catch (error) {}
});

// ROUTE 5: GET /api/auth/reset-password/:id/:token
router.get("/reset-password/:id/:token", async (req, res) => {
    const { id, token } = req.params;
    console.log(req.params);
    const oldUser = await User.findOne({ _id: id });
    if (!oldUser) {
      return res.json({ status: "User Not Exists!!" });
    }
    const secret = JWT_SECRET + oldUser.password;
    try {
      const verify = jwt.verify(token, secret);
      res.render("index", { email: verify.email, status: "Not Verified" });
    } catch (error) {
      console.log(error);
      res.send("Not Verified");
    }
  });

// ROUTE 6: POST /api/auth/reset-password/:id/:token
router.post("/reset-password/:id/:token", async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;
  
    const oldUser = await User.findOne({ _id: id });
    if (!oldUser) {
      return res.json({ status: "User Not Exists!!" });
    }
    const secret = JWT_SECRET + oldUser.password;
    try {
      const verify = jwt.verify(token, secret);
      const encryptedPassword = await bcrypt.hash(password, 10);
      await User.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            password: encryptedPassword,
          },
        }
      );

      res.render("index", { email: verify.email, status: "verified" });
    } catch (error) {
      console.log(error);
      res.json({ status: "Something Went Wrong" });
    }
  });

module.exports = router;
