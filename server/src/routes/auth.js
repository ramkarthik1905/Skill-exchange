import express from "express";
import User from "../models/User.js";
import { signToken } from "../middleware/auth.js";

const router = express.Router();

function ageFromDateOfBirth(dateOfBirth) {
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < d.getUTCDate())) {
    years -= 1;
  }
  return years;
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, name, dateOfBirth, age } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }
    if (age === undefined || age === null || dateOfBirth === undefined || dateOfBirth === null || dateOfBirth === "") {
      return res.status(400).json({ error: "age and date of birth are required" });
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 130) {
      return res.status(400).json({ error: "age must be a whole number between 0 and 130" });
    }
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return res.status(400).json({ error: "invalid date of birth" });
    }
    const computedAge = ageFromDateOfBirth(dob);
    if (computedAge === null || computedAge < 0) {
      return res.status(400).json({ error: "invalid date of birth" });
    }
    if (computedAge !== ageNum) {
      return res.status(400).json({ error: "age does not match date of birth" });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      name: name.trim(),
      age: ageNum,
      dateOfBirth: dob,
    });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
