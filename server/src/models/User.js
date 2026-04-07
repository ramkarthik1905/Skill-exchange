import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const offeredSkillEntrySchema = new Schema(
  {
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    proficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      default: "intermediate",
    },
    yearsExperience: { type: Number, min: 0, max: 80, default: 0 },
    /** Abstract barter “value” for matching weights */
    teachingAvailability: {
      type: String,
      enum: ["occasional", "regular", "flexible"],
      default: "flexible",
    },
    sessionLengthMinutes: { type: Number, default: 60, min: 15, max: 480 },
    notes: { type: String, maxlength: 2000 },
  },
  { _id: true }
);

const wantedSkillEntrySchema = new Schema(
  {
    skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    urgency: { type: Number, min: 1, max: 10, default: 5 },
    desiredProficiencyTarget: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert", "any"],
      default: "any",
    },
    notes: { type: String, maxlength: 2000 },
  },
  { _id: true }
);

const availabilityBlockSchema = new Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startMinute: { type: Number, min: 0, max: 1440, required: true },
    endMinute: { type: Number, min: 0, max: 1440, required: true },
    timezone: { type: String, default: "UTC" },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    /** Declared age at signup; should align with dateOfBirth (validated on register). */
    age: { type: Number, min: 0, max: 130 },
    dateOfBirth: { type: Date },
    headline: { type: String, default: "", maxlength: 200 },
    bio: { type: String, default: "", maxlength: 5000 },
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: undefined },
      },
    },
    timezone: { type: String, default: "UTC" },
    linkedInUrl: { type: String, default: "" },
    skillsOffered: [offeredSkillEntrySchema],
    skillsWanted: [wantedSkillEntrySchema],
    weeklyAvailability: [availabilityBlockSchema],
    /** Denormalized for quick lookups; keep in sync in app layer */
    activeExchangeCount: { type: Number, default: 0 },
    completedExchangeCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    /** Virtual-style refs for heavy queries */
    exchangeRequestsInitiated: [{ type: Schema.Types.ObjectId, ref: "ExchangeRequest" }],
    exchangeRequestsReceived: [{ type: Schema.Types.ObjectId, ref: "ExchangeRequest" }],
    reviewsWritten: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    reviewsReceived: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ "skillsOffered.skill": 1 });
userSchema.index({ "skillsWanted.skill": 1 });

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

export default mongoose.model("User", userSchema);
