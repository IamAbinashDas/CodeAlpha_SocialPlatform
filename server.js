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

// 1. Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  handle: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  bio: { type: String, default: "Exploring the mesh protocol." },
  avatar: { type: String, default: "" }, // Defaults to empty so user adds their own
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  media: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    authorHandle: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

// 2. Auth Middleware
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth token missing' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'pulse_social_secret_key_2026');
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
};

// 3. Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, handle, email, password } = req.body;
    if (!name || !handle || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanHandle = handle.trim().toLowerCase().replace('@', '');

    const existing = await User.findOne({ $or: [{ email: cleanEmail }, { handle: cleanHandle }] });
    if (existing) {
      return res.status(400).json({ error: 'Email or handle already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      handle: cleanHandle,
      email: cleanEmail,
      password: hashedPassword,
      avatar: "" // No initial platform avatar
    });

    const token = jwt.sign(
      { id: user._id, handle: user.handle },
      process.env.JWT_SECRET || 'pulse_social_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, handle: user.handle, bio: user.bio, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, handle: user.handle },
      process.env.JWT_SECRET || 'pulse_social_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, handle: user.handle, bio: user.bio, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// 4. User Profile & Edit Profile (Instagram Style)
app.get('/api/users/:handle', async (req, res) => {
  try {
    const user = await User.findOne({ handle: req.params.handle.toLowerCase() }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const posts = await Post.find({ author: user._id }).populate('author', 'name handle avatar').sort({ createdAt: -1 });
    res.json({ user, posts });
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Edit Profile Route
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        ...(name && { name: name.trim() }),
        bio: bio !== undefined ? bio.trim() : "Exploring the mesh protocol.",
        avatar: avatar !== undefined ? avatar.trim() : ""
      },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const target = await User.findById(targetId);
    const self = await User.findById(req.user.id);
    const isFollowing = target.followers.includes(self._id);

    if (isFollowing) {
      target.followers.pull(self._id);
      self.following.pull(target._id);
    } else {
      target.followers.push(self._id);
      self.following.push(target._id);
    }

    await target.save();
    await self.save();
    res.json({ following: !isFollowing });
  } catch {
    res.status(500).json({ error: 'Follow toggle failed' });
  }
});

// 5. Post Actions (Broadcast, Delete, Like, Comment)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'name handle avatar').sort({ createdAt: -1 });
    res.json(posts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch transmissions' });
  }
});

app.post('/api/posts', auth, async (req, res) => {
  try {
    const { content, media } = req.body;
    if (!content) return res.status(400).json({ error: 'Content cannot be empty' });

    const post = await Post.create({
      author: req.user.id,
      content,
      media: media || ""
    });
    const populated = await post.populate('author', 'name handle avatar');
    res.status(201).json(populated);
  } catch {
    res.status(500).json({ error: 'Could not transmit post' });
  }
});

// Delete Post Route (Instagram style delete for authors)
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Transmission not found' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this transmission.' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transmission deleted from mesh.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

app.post('/api/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const hasLiked = post.likes.includes(req.user.id);
    if (hasLiked) {
      post.likes.pull(req.user.id);
    } else {
      post.likes.push(req.user.id);
    }
    await post.save();
    res.json({ likesCount: post.likes.length, hasLiked: !hasLiked });
  } catch {
    res.status(500).json({ error: 'Like toggle failed' });
  }
});

app.post('/api/posts/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment required' });

    const user = await User.findById(req.user.id);
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            author: user._id,
            authorName: user.name,
            authorHandle: user.handle,
            text
          }
        }
      },
      { new: true }
    );
    res.json(post);
  } catch {
    res.status(500).json({ error: 'Comment failed' });
  }
});

const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codealpha_social')
  .then(() => {
    console.log('[NEXUS] MongoDB Connected to codealpha_social');
    app.listen(PORT, () => console.log(`[NEXUS] Operational on http://localhost:${PORT}`));
  })
  .catch(console.error);