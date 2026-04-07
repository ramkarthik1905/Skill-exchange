import mongoose from "mongoose";
import User from "../models/User.js";

const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };
const PROFICIENCY_WEIGHT = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
const TEACHING_WEIGHT = { occasional: 1, regular: 2, flexible: 3 };

function idKey(id) {
  return id instanceof mongoose.Types.ObjectId ? id.toString() : String(id);
}

/**
 * Computes bilateral skill barter compatibility:
 * - Candidate offers a skill the current user wants.
 * - Candidate wants a skill the current user offers.
 * Returns sorted matches with score 0–100 and skill pair details.
 */
export async function findMatchesForUser(userId, { limit = 20 } = {}) {
  const user = await User.findById(userId)
    .populate("skillsOffered.skill")
    .populate("skillsWanted.skill")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const offeredIds = new Set(
    (user.skillsOffered || []).map((o) => idKey(o.skill?._id || o.skill))
  );
  const wantedIds = new Set(
    (user.skillsWanted || []).map((w) => idKey(w.skill?._id || w.skill))
  );

  if (offeredIds.size === 0 || wantedIds.size === 0) {
    return {
      matches: [],
      reason:
        offeredIds.size === 0
          ? "Add skills you can offer to get matches"
          : "Add skills you want to learn to get matches",
    };
  }

  const candidates = await User.find({
    _id: { $ne: user._id },
    isActive: true,
    "skillsOffered.skill": { $in: [...wantedIds].map((id) => new mongoose.Types.ObjectId(id)) },
    "skillsWanted.skill": { $in: [...offeredIds].map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .populate("skillsOffered.skill")
    .populate("skillsWanted.skill")
    .limit(200)
    .lean();

  const matches = [];

  for (const candidate of candidates) {
    let bestScore = 0;
    let bestPair = null;

    for (const theyOffer of candidate.skillsOffered || []) {
      const offerSkillId = idKey(theyOffer.skill?._id || theyOffer.skill);
      if (!wantedIds.has(offerSkillId)) continue;

      for (const theyWant of candidate.skillsWanted || []) {
        const wantSkillId = idKey(theyWant.skill?._id || theyWant.skill);
        if (!offeredIds.has(wantSkillId)) continue;

        const myWantEntry = user.skillsWanted.find(
          (w) => idKey(w.skill?._id || w.skill) === offerSkillId
        );
        const myOfferEntry = user.skillsOffered.find(
          (o) => idKey(o.skill?._id || o.skill) === wantSkillId
        );

        const urgency = myWantEntry?.urgency ?? 5;
        const priorityW = PRIORITY_WEIGHT[myWantEntry?.priority] ?? 2;
        const profW = PROFICIENCY_WEIGHT[myOfferEntry?.proficiency] ?? 2;
        const theirUrgency = theyWant?.urgency ?? 5;
        const theirPriorityW = PRIORITY_WEIGHT[theyWant?.priority] ?? 2;
        const theirProfW = PROFICIENCY_WEIGHT[theyOffer?.proficiency] ?? 2;
        const teachW = TEACHING_WEIGHT[theyOffer?.teachingAvailability] ?? 2;

        const raw =
          urgency * 3 +
          priorityW * 10 +
          profW * 6 +
          theirUrgency * 3 +
          theirPriorityW * 10 +
          theirProfW * 6 +
          teachW * 4;

        const score = Math.min(100, Math.round((raw / 120) * 100));

        if (score > bestScore) {
          bestScore = score;
          bestPair = {
            theyTeachYou: {
              skill: theyOffer.skill,
              theirProficiency: theyOffer.proficiency,
              yourPriority: myWantEntry?.priority,
            },
            youTeachThem: {
              skill: myOfferEntry?.skill || wantSkillId,
              yourProficiency: myOfferEntry?.proficiency,
              theirPriority: theyWant?.priority,
            },
          };
        }
      }
    }

    if (bestPair && bestScore > 0) {
      matches.push({
        user: {
          _id: candidate._id,
          name: candidate.name,
          headline: candidate.headline,
          averageRating: candidate.averageRating,
          reviewCount: candidate.reviewCount,
          timezone: candidate.timezone,
        },
        score: bestScore,
        pair: bestPair,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return { matches: matches.slice(0, limit) };
}
