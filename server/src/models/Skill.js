import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Canonical skill taxonomy. Referenced by User offerings/wants and ExchangeRequests.
 */
const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "" },
    tags: [{ type: String, trim: true, lowercase: true }],
    /** Maintainer or first contributor */
    contributedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verified: { type: Boolean, default: false },
    popularityScore: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

skillSchema.index({ category: 1, slug: 1 });
skillSchema.index({ tags: 1 });

export default mongoose.model("Skill", skillSchema);
