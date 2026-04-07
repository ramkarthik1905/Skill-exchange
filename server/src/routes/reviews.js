import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import ExchangeRequest from "../models/ExchangeRequest.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { exchangeRequestId, revieweeId, rating, title, comment, dimensions, wouldExchangeAgain } =
      req.body;
    if (!exchangeRequestId || !revieweeId || !rating) {
      await session.abortTransaction();
      return res.status(400).json({ error: "exchangeRequestId, revieweeId, rating required" });
    }
    const ex = await ExchangeRequest.findById(exchangeRequestId).session(session);
    if (!ex || ex.status !== "completed") {
      await session.abortTransaction();
      return res.status(400).json({ error: "Exchange must be completed" });
    }
    const uid = String(req.user._id);
    if (String(ex.initiator) !== uid && String(ex.recipient) !== uid) {
      await session.abortTransaction();
      return res.status(403).json({ error: "Forbidden" });
    }
    if (String(ex.initiator) !== String(revieweeId) && String(ex.recipient) !== String(revieweeId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: "reviewee must be the other party" });
    }
    if (String(revieweeId) === uid) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Cannot review yourself" });
    }

    const review = await Review.create(
      [
        {
          exchangeRequest: exchangeRequestId,
          reviewer: req.user._id,
          reviewee: revieweeId,
          rating,
          title,
          comment,
          dimensions,
          wouldExchangeAgain,
        },
      ],
      { session }
    );

    const reviewee = await User.findById(revieweeId).session(session);
    const newCount = (reviewee.reviewCount || 0) + 1;
    const prevAvg = reviewee.averageRating || 0;
    const newAvg = (prevAvg * (newCount - 1) + Number(rating)) / newCount;
    await User.updateOne(
      { _id: revieweeId },
      {
        $set: { averageRating: Math.round(newAvg * 100) / 100, reviewCount: newCount },
        $push: { reviewsReceived: review[0]._id },
      },
      { session }
    );
    await User.updateOne(
      { _id: req.user._id },
      { $push: { reviewsWritten: review[0]._id } },
      { session }
    );
    await ExchangeRequest.updateOne(
      { _id: exchangeRequestId },
      { $push: { relatedReviews: review[0]._id } },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(review[0]);
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) {
      return res.status(409).json({ error: "You already reviewed this exchange" });
    }
    console.error(err);
    res.status(500).json({ error: "Review failed" });
  } finally {
    session.endSession();
  }
});

router.get("/user/:userId", async (req, res) => {
  const list = await Review.find({ reviewee: req.params.userId })
    .populate("reviewer", "name headline")
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(list);
});

export default router;
