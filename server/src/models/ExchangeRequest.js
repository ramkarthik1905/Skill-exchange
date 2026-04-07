import mongoose from "mongoose";

const { Schema } = mongoose;

const proposedSessionSchema = new Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    timezone: { type: String, default: "UTC" },
    proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, maxlength: 1000 },
    responses: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },
        respondedAt: { type: Date },
      },
    ],
    status: {
      type: String,
      enum: ["proposed", "confirmed", "cancelled"],
      default: "proposed",
    },
  },
  { timestamps: true }
);

/**
 * Barter exchange: initiator offers one skill session; recipient provides another.
 */
const exchangeRequestSchema = new Schema(
  {
    initiator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** Skill initiator will teach / deliver */
    skillOfferedByInitiator: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    /** Skill initiator wants from recipient */
    skillRequestedFromRecipient: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "accepted", "declined", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    proposedSessions: [proposedSessionSchema],
    confirmedSession: {
      start: { type: Date },
      end: { type: Date },
      timezone: { type: String },
    },
    initiatorNotes: { type: String, maxlength: 2000 },
    recipientNotes: { type: String, maxlength: 2000 },
    completedAt: { type: Date },
    relatedReviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true }
);

exchangeRequestSchema.index({ initiator: 1, recipient: 1, status: 1 });
exchangeRequestSchema.index({ "confirmedSession.start": 1 });

export default mongoose.model("ExchangeRequest", exchangeRequestSchema);
