const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  enrolledCourses: [{
    courseId: String,
    courseName: String,
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  profile: {
    bio: String,
    phone: String,
    address: String,
    dateOfBirth: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Course Schema
const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  enrolledStudents: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: Number,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);

// Middleware to check authentication
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.session.token;
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Routes

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API Routes

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Validation
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store token in session
    req.session.token = token;
    req.session.userId = user._id;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store token in session
    req.session.token = token;
    req.session.userId = user._id;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout user
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, bio, phone, address, dateOfBirth } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.profile.bio = bio;
    if (phone) user.profile.phone = phone;
    if (address) user.profile.address = address;
    if (dateOfBirth) user.profile.dateOfBirth = dateOfBirth;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true });
    res.json(courses);
  } catch (error) {
    console.error('Courses fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in course
app.post('/api/courses/:courseId/enroll', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already enrolled
    const alreadyEnrolled = user.enrolledCourses.some(
      enrolled => enrolled.courseId === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Add to user's enrolled courses
    user.enrolledCourses.push({
      courseId: course._id,
      courseName: course.title
    });

    // Add to course's enrolled students
    course.enrolledStudents.push({
      userId: user._id
    });

    await user.save();
    await course.save();

    res.json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.session.token;
  
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ 
      authenticated: true, 
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Seed initial courses
app.post('/api/seed-courses', async (req, res) => {
  try {
    const courses = [
      {
        title: "Web Development Bootcamp",
        description: "Complete full-stack web development course covering HTML, CSS, JavaScript, React, Node.js, and MongoDB.",
        instructor: "John Smith",
        duration: "12 weeks",
        level: "Beginner",
        price: 299,
        category: "Web Development",
        image: "img/course1.png",
        rating: 4.8
      },
      {
        title: "Artificial Intelligence & Machine Learning",
        description: "Comprehensive AI/ML course covering Python, TensorFlow, neural networks, and deep learning algorithms.",
        instructor: "Dr. Sarah Johnson",
        duration: "16 weeks",
        level: "Intermediate",
        price: 499,
        category: "Artificial Intelligence",
        image: "img/course2.png",
        rating: 4.9
      },
      {
        title: "Data Science Masterclass",
        description: "Learn data analysis, visualization, statistics, and machine learning with Python and R.",
        instructor: "Michael Chen",
        duration: "14 weeks",
        level: "Intermediate",
        price: 399,
        category: "Data Science",
        image: "img/course3.png",
        rating: 4.7
      },
      {
        title: "Cybersecurity Fundamentals",
        description: "Essential cybersecurity concepts, ethical hacking, network security, and penetration testing.",
        instructor: "Alex Rodriguez",
        duration: "10 weeks",
        level: "Beginner",
        price: 349,
        category: "Cybersecurity",
        image: "img/cybersecurit56.png",
        rating: 4.6
      },
      {
        title: "Mobile App Development",
        description: "Build native and cross-platform mobile apps using React Native and Flutter.",
        instructor: "Emily Davis",
        duration: "12 weeks",
        level: "Intermediate",
        price: 379,
        category: "Mobile Development",
        image: "img/course51.jpg",
        rating: 4.5
      },
      {
        title: "Robotics & IoT",
        description: "Explore robotics programming, IoT devices, Arduino, Raspberry Pi, and automation systems.",
        instructor: "Dr. Robert Wilson",
        duration: "15 weeks",
        level: "Advanced",
        price: 549,
        category: "Robotics",
        image: "img/course61.png",
        rating: 4.8
      }
    ];

    await Course.deleteMany({}); // Clear existing courses
    await Course.insertMany(courses);

    res.json({ message: 'Courses seeded successfully', count: courses.length });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Error seeding courses' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application`);
});