const Router = require("express");
const router = Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const otp = require("otp-generator");
require("dotenv").config();
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    return res.status(400).send("User already exists");
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const newUser = new User({
    name,
    email,
    password: hash,
    
  });
  await newUser.save();
  const token = jwt.sign({ _id: newUser._id }, "secret");
  res.header("auth-token", token).send("token:", token);
  // There's only one condition, only HR can create employee
  if (role === "HR") {
    const transporter = nodemailer.createTransport({
      service: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });
    const otpCode = otp.generate(6, { upperCase: false, specialChars: false });
    const mailOptions = {
      from: "Rama <rama60@gmail.com>",
      to: "panda89@gmail.com",
      subject: "OTP for Employee Registration",
      text: `Your OTP is ${otpCode}`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    const newUser = new User({
      name,
      email,
      password: hash,
   
      otpCode,
    });
    await newUser.save();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send("User does not exist");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send("Incorrect Password");
  }
  const token = jwt.sign(
    { _id: user._id },
    "secret",
    { expiresIn: "5m" },
    (err, token) => {
      if (err) {
        console.log(err);
      } else {
        res.header("auth-token", token).send(token);
      }
    }
  );
});

router.get("/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).send("Token is required");
  }
  jwt.verify(token, "secret", (err, decoded) => {
    if (err) {
      return res.status(400).send("Invalid Token");
    } else {
      return res.status(200).send("Token is valid");
    }
  });
});

router.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    return res.status(400).send("User does not exist");
  }
  res.send(user);
});
//for /reset-password route, send an email to the user with a link to reset password.
router.get("/reset-password//getotp", async (req, res) => {
  const { email } = req.query;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send("User does not exist");
  }
  const transporter = nodemailer.createTransport({
    service: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
  const otpCode = otp.generate(6, { upperCase: false, specialChars: false });
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "OTP for Employee Registration",
    text: `Your OTP is ${otpCode}`,
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
  const newUser = new User({
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    otpCode,
  });
  await newUser.save();
  res.send("OTP has been sent to your email");
});
router.put("/reset-password/reset", async (req, res) => {
  const { email, otpCode, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send("User does not exist");
  }
  if (user.otpCode !== otpCode) {
    return res.status(400).send("Invalid OTP");
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const newUser = new User({
    name: user.name,
    email: user.email,
    password: hash,
  
    otpCode: null,
  });
  await newUser.save();
  res.send("Password has been reset");
});
module.exports = router;
