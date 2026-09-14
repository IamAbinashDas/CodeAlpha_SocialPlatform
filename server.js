require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Schemas (Users, Posts, Comments, Followers)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  handle: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "Exploring full-stack systems and engineering." },
  avatar: { type: String, default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  media: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [
    {
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      authorName: String,
      authorHandle: String,
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

// 2. Auth Middleware
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Please login.' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'pulse_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid.' });
  }
};

// 3. Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, handle, email, password } = req.body;
    if (!name || !handle || !email || !password) return res.status(400).json({ error: 'All fields required.' });

    const existing = await User.findOne({ $or: [{ email }, { handle }] });
    if (existing) return res.status(400).json({ error: 'Email or handle already in use.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, handle: handle.toLowerCase(), email, password: hashedPassword });
    const token = jwt.sign({ id: user._id, name: user.name, handle: user.handle }, process.env.JWT_SECRET || 'pulse_secret', { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user._id, name: user.name, handle: user.handle, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user._id, name: user.name, handle: user.handle }, process.env.JWT_SECRET || 'pulse_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, handle: user.handle, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// 4. Feed & Post Routes
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'name handle avatar').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed.' });
  }
});

app.post('/api/posts', auth, async (req, res) => {
  try {
    const { content, media } = req.body;
    if (!content) return res.status(400).json({ error: 'Post content cannot be empty.' });

    const post = await Post.create({
      author: req.user.id,
      content,
      media: media || ""
    });
    const populated = await Post.findById(post._id).populate('author', 'name handle avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Could not create post.' });
  }
});

// 5. Like Toggle System
app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const index = post.likes.indexOf(req.user.id);
    if (index === -1) {
      post.likes.push(req.user.id);
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();
    res.json({ likesCount: post.likes.length, isLiked: index === -1 });
  } catch (err) {
    res.status(500).json({ error: 'Error toggling like.' });
  }
});

// 6. Commenting System
app.post('/api/posts/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required.' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const newComment = {
      author: req.user.id,
      authorName: req.user.name,
      authorHandle: req.user.handle,
      text,
      createdAt: new Date()
    };
    post.comments.push(newComment);
    await post.save();
    res.status(201).json(post.comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// 7. Profile & Follow System
app.get('/api/users/:handle', async (req, res) => {
  try {
    const user = await User.findOne({ handle: req.params.handle.toLowerCase() }).select('-password');
    if (!user) return res.status(404).json({ error: 'User profile not found.' });

    const posts = await Post.find({ author: user._id }).populate('author', 'name handle avatar').sort({ createdAt: -1 });
    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user profile.' });
  }
});

app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ error: "You cannot follow yourself." });

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser || !currentUser) return res.status(404).json({ error: 'User not found.' });

    const isFollowing = targetUser.followers.includes(req.user.id);
    if (isFollowing) {
      targetUser.followers.pull(req.user.id);
      currentUser.following.pull(targetUser._id);
    } else {
      targetUser.followers.push(req.user.id);
      currentUser.following.push(targetUser._id);
    }

    await targetUser.save();
    await currentUser.save();
    res.json({ isFollowing: !isFollowing, followersCount: targetUser.followers.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update follow state.' });
  }
});

const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codealpha_social')
  .then(() => {
    console.log('MongoDB Connected to codealpha_social');
    app.listen(PORT, () => console.log(`PULSE Social running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB Error:', err));