import express from "express";
import mongoose from "mongoose";
import ExchangeRequest from "../models/ExchangeRequest.js";
import User from "../models/User.js";
import { findMatchesForUser } from "../services/matchingService.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/my", requireAuth, async (req, res) => {
  const list = await ExchangeRequest.find({
    $or: [{ initiator: req.user._id }, { recipient: req.user._id }],
  })
    .populate("initiator", "name email headline")
    .populate("recipient", "name email headline")
    .populate("skillOfferedByInitiator")
    .populate("skillRequestedFromRecipient")
    .sort({ updatedAt: -1 });
  res.json(list);
});

router.get("/calendar", requireAuth, async (req, res) => {
  const filter = {
    $and: [
      { $or: [{ initiator: req.user._id }, { recipient: req.user._id }] },
      { status: { $nin: ["completed", "cancelled", "declined"] } },
    ],
  };
  const list = await ExchangeRequest.find(filter)
    .populate("initiator", "name")
    .populate("recipient", "name")
    .populate("skillOfferedByInitiator", "name")
    .populate("skillRequestedFromRecipient", "name")
    .populate("proposedSessions.proposedBy", "name");
  res.json(list);
});

/** Create exchange from match suggestion */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { recipientId, skillOfferedByInitiator, skillRequestedFromRecipient } = req.body;
    if (!recipientId || !skillOfferedByInitiator || !skillRequestedFromRecipient) {
      return res.status(400).json({ error: "recipientId and both skill ids required" });
    }
    const { matches } = await findMatchesForUser(req.user._id, { limit: 50 });
    const ok = matches.some(
      (m) =>
        String(m.user._id) === String(recipientId) &&
        String(m.pair.youTeachThem.skill?._id || m.pair.youTeachThem.skill) ===
          String(skillOfferedByInitiator) &&
        String(m.pair.theyTeachYou.skill?._id || m.pair.theyTeachYou.skill) ===
          String(skillRequestedFromRecipient)
    );
    if (!ok) {
      return res.status(400).json({ error: "Skills do not form a valid bilateral match" });
    }
    const matchEntry = matches.find((m) => String(m.user._id) === String(recipientId));
    const ex = await ExchangeRequest.create({
      initiator: req.user._id,
      recipient: recipientId,
      skillOfferedByInitiator,
      skillRequestedFromRecipient,
      matchScore: matchEntry?.score ?? 0,
    });
    await User.updateOne(
      { _id: req.user._id },
      { $push: { exchangeRequestsInitiated: ex._id } }
    );
    await User.updateOne({ _id: recipientId }, { $push: { exchangeRequestsReceived: ex._id } });
    const populated = await ExchangeRequest.findById(ex._id)
      .populate("initiator", "name email")
      .populate("recipient", "name email")
      .populate("skillOfferedByInitiator")
      .populate("skillRequestedFromRecipient");
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create exchange" });
  }
});

router.post("/:id/sessions", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { start, end, timezone, message } = req.body;
  if (!start || !end) {
    return res.status(400).json({ error: "start and end ISO dates required" });
  }
  const ex = await ExchangeRequest.findById(id);
  if (!ex) return res.status(404).json({ error: "Not found" });
  const uid = String(req.user._id);
  if (String(ex.initiator) !== uid && String(ex.recipient) !== uid) {
    return res.status(403).json({ error: "Forbidden" });
  }
  ex.proposedSessions.push({
    start: new Date(start),
    end: new Date(end),
    timezone: timezone || "UTC",
    proposedBy: req.user._id,
    message: message || "",
    responses: [
      { user: ex.initiator, status: "pending" },
      { user: ex.recipient, status: "pending" },
    ],
  });
  await ex.save();
  const populated = await ExchangeRequest.findById(ex._id)
    .populate("proposedSessions.proposedBy", "name")
    .populate("skillOfferedByInitiator", "name")
    .populate("skillRequestedFromRecipient", "name");
  res.json(populated);
});

router.patch("/:id/confirm-session", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { sessionIndex } = req.body;
  const ex = await ExchangeRequest.findById(id);
  if (!ex) return res.status(404).json({ error: "Not found" });
  const uid = new mongoose.Types.ObjectId(req.user._id);
  const idx = sessionIndex ?? ex.proposedSessions.length - 1;
  const session = ex.proposedSessions[idx];
  if (!session) return res.status(400).json({ error: "Invalid session" });
  for (const r of session.responses) {
    if (String(r.user) === String(uid)) {
      r.status = "accepted";
      r.respondedAt = new Date();
    }
  }
  const allAccepted = session.responses.every((r) => r.status === "accepted");
  if (allAccepted) {
    session.status = "confirmed";
    ex.confirmedSession = {
      start: session.start,
      end: session.end,
      timezone: session.timezone,
    };
    ex.status = "accepted";
  }
  await ex.save();
  res.json(ex);
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const ex = await ExchangeRequest.findById(req.params.id);
  if (!ex) return res.status(404).json({ error: "Not found" });
  const uid = String(req.user._id);
  const allowed =
    status === "accepted" || status === "declined" || status === "in_progress" || status === "completed";
  if (!allowed) return res.status(400).json({ error: "Invalid status" });
  if (String(ex.recipient) === uid && (status === "accepted" || status === "declined")) {
    ex.status = status;
  } else if (
    (String(ex.initiator) === uid || String(ex.recipient) === uid) &&
    (status === "in_progress" || status === "completed")
  ) {
    ex.status = status;
    if (status === "completed") {
      ex.completedAt = new Date();
      await User.updateOne({ _id: ex.initiator }, { $inc: { completedExchangeCount: 1 } });
      await User.updateOne({ _id: ex.recipient }, { $inc: { completedExchangeCount: 1 } });
    }
  } else {
    return res.status(403).json({ error: "Not allowed for this status change" });
  }
  await ex.save();
  res.json(ex);
});

router.patch("/:id/notes", requireAuth, async (req, res) => {
  const { initiatorNotes, recipientNotes } = req.body;
  const ex = await ExchangeRequest.findById(req.params.id);
  if (!ex) return res.status(404).json({ error: "Not found" });

  const uid = String(req.user._id);
  const isInitiator = String(ex.initiator) === uid;
  const isRecipient = String(ex.recipient) === uid;

  if (!isInitiator && !isRecipient) {
    return res.status(403).json({ error: "Not authorized to update this exchange" });
  }

  if (initiatorNotes !== undefined && isInitiator) {
    ex.initiatorNotes = initiatorNotes;
  }

  if (recipientNotes !== undefined && isRecipient) {
    ex.recipientNotes = recipientNotes;
  }

  await ex.save();
  res.json(ex);
});

export default router;
