require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  handle: String,
  email: String,
  password: String,
  bio: String,
  avatar: String,
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  media: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: Array,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codealpha_social');
  await User.deleteMany({});
  await Post.deleteMany({});

  const pwd = await bcrypt.hash('password123', 10);

  const u1 = await User.create({
    name: "Elena Rostova",
    handle: "elena_dev",
    email: "elena@example.com",
    password: pwd,
    bio: "Systems architect & UI maximalist. Working on high-concurrency protocols.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"
  });

  const u2 = await User.create({
    name: "Marcus Vance",
    handle: "marcusv",
    email: "marcus@example.com",
    password: pwd,
    bio: "Full stack TypeScript & Rust explorer. Building the open web.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
  });

  await Post.create([
    {
      author: u1._id,
      content: "Just shipped our real-time messaging pipeline using WebSockets and Redis streams. Zero drops under benchmark load! 🚀",
      media: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
      likes: [u2._id],
      comments: [
        { author: u2._id, authorName: u2.name, authorHandle: u2.handle, text: "Incredible engineering! What was the latency delta?" }
      ]
    },
    {
      author: u2._id,
      content: "Clean architecture is not about writing less code; it is about making change trivial.",
      media: "",
      likes: [u1._id],
      comments: []
    }
  ]);

  console.log("✓ Demo users & posts seeded into codealpha_social!");
  process.exit(0);
}

seed().catch(console.error);