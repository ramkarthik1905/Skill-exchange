import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    exchangeRequest: {
      type: Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      required: true,
      index: true,
    },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewee: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 200 },
    comment: { type: String, maxlength: 5000 },
    dimensions: {
      communication: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      skillQuality: { type: Number, min: 1, max: 5 },
    },
    wouldExchangeAgain: { type: Boolean, default: true },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ exchangeRequest: 1, reviewer: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
