const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing of JSON/URL-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'students.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// Automatically copy the generated student image from the brain directory to the public directory
const srcImg = 'C:/Users/nithi/.gemini/antigravity-ide/brain/4a709b9d-22c3-46e3-baf2-55fcee0fed31/student_studying_1783501590646.png';
const destImg = path.join(__dirname, 'public', 'student_studying.png');
try {
  if (fs.existsSync(srcImg)) {
    fs.copyFileSync(srcImg, destImg);
    console.log('Successfully copied student studying image to public/student_studying.png');
  } else {
    console.warn('Source image not found at:', srcImg);
  }
} catch (copyErr) {
  console.error('Error copying generated image:', copyErr);
}

// Automatically copy the uploaded payment QR code image to public directory
const qrSrc = 'C:/Users/nithi/.gemini/antigravity-ide/brain/4a709b9d-22c3-46e3-baf2-55fcee0fed31/media__1783506825577.png';
const qrDest = path.join(__dirname, 'public', 'payment_qr.png');
try {
  if (fs.existsSync(qrSrc)) {
    fs.copyFileSync(qrSrc, qrDest);
    console.log('Successfully copied payment QR code to public/payment_qr.png');
  } else {
    console.warn('Source QR code not found at:', qrSrc);
  }
} catch (copyErr) {
  console.error('Error copying payment QR code:', copyErr);
}

// Serve public static assets
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded documents statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve the generated study student image
app.get('/student_studying.png', (req, res) => {
  res.sendFile('C:/Users/nithi/.gemini/antigravity-ide/brain/4a709b9d-22c3-46e3-baf2-55fcee0fed31/student_studying_1783501590646.png');
});

// Helper functions for reading/writing students JSON db
function readStudentsDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading students database:', err);
    return [];
  }
}

function writeStudentsDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing students database:', err);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).fields([
  { name: 'paymentScreenshot', maxCount: 1 },
  { name: 'marksCard', maxCount: 1 },
  { name: 'studentIdCard', maxCount: 1 }
]);

// --- API Endpoints ---

// 1. Submit Student Registration (Form submission + files)
app.post('/api/register', (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(500).json({ success: false, message: 'Server upload error' });
    }

    try {
      const studentData = req.body;
      const files = req.files || {};

      // Parse subjects details if sent as a JSON string
      let subjectsList = [];
      if (studentData.subjectsNotCleared) {
        try {
          subjectsList = JSON.parse(studentData.subjectsNotCleared);
        } catch (e) {
          console.error('Failed to parse subjects list:', e);
          subjectsList = [];
        }
      }

      // Structure registration details based on 8 Sections
      const registration = {
        id: 'COACH-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000),
        createdAt: new Date().toISOString(),
        status: 'Pending',
        
        // SECTION 1: Student Details
        studentDetails: {
          fullName: studentData.fullName,
          mobile: studentData.mobile,
          whatsapp: studentData.whatsapp,
          email: studentData.email,
          dob: studentData.dob || '',
          gender: studentData.gender || 'Prefer not to say',
          collegeName: studentData.collegeName,
          university: studentData.university,
          branch: studentData.branch,
          currentSemester: studentData.currentSemester,
          usn: studentData.usn,
          currentCity: studentData.currentCity || ''
        },
        
        // SECTION 2: Academic Details
        academicDetails: {
          subjectsNotClearedCount: studentData.subjectsNotClearedCount || '4',
          subjectsList: subjectsList
        },
        
        // SECTION 3: Coaching Package Selection
        packageSelection: {
          packageName: studentData.packageName || 'GO - ₹14,999'
        },
        
        // SECTION 4: Online Learning Details
        learningDetails: {
          device: studentData.device || 'Laptop',
          internet: studentData.internet || 'Wi-Fi',
          preferredBatch: studentData.preferredBatch || 'Evening'
        },
        
        // SECTION 5: Payment Details
        paymentDetails: {
          registrationFee: '₹10,000',
          remainingFeeOption: studentData.remainingFeeOption || 'Full Payment',
          registrationFeeStatus: studentData.registrationFeeStatus || 'Not Yet Paid',
          amountPaid: studentData.amountPaid || '',
          transactionId: studentData.transactionId || '',
          paymentScreenshot: files.paymentScreenshot ? {
            originalName: files.paymentScreenshot[0].originalname,
            filename: files.paymentScreenshot[0].filename,
            path: `/uploads/${files.paymentScreenshot[0].filename}`
          } : null
        },
        
        // SECTION 6: Documents
        documents: {
          marksCard: files.marksCard ? {
            originalName: files.marksCard[0].originalname,
            filename: files.marksCard[0].filename,
            path: `/uploads/${files.marksCard[0].filename}`
          } : null,
          studentIdCard: files.studentIdCard ? {
            originalName: files.studentIdCard[0].originalname,
            filename: files.studentIdCard[0].filename,
            path: `/uploads/${files.studentIdCard[0].filename}`
          } : null
        },
        
        // SECTION 8: Student Agreement
        agreement: {
          candidateName: studentData.candidateName,
          signature: studentData.signature, // typed name
          date: studentData.agreementDate || new Date().toISOString().split('T')[0]
        }
      };

      // Read, append, write to local db
      const students = readStudentsDB();
      students.push(registration);
      writeStudentsDB(students);

      return res.status(201).json({
        success: true,
        message: 'Registration submitted successfully!',
        studentId: registration.id
      });

    } catch (dbErr) {
      console.error('Database write error:', dbErr);
      return res.status(500).json({ success: false, message: 'Failed to save registration details.' });
    }
  });
});

// 2. Fetch all student registrations (Admin endpoint)
app.get('/api/admin/students', (req, res) => {
  const students = readStudentsDB();
  res.json({ success: true, students });
});

// 3. Update student status (Admin endpoint)
app.patch('/api/admin/students/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected', 'Hold'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  const students = readStudentsDB();
  const studentIndex = students.findIndex(s => s.id === id);

  if (studentIndex === -1) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  students[studentIndex].status = status;
  writeStudentsDB(students);

  res.json({ success: true, message: `Status updated to ${status}`, student: students[studentIndex] });
});

// Serve frontend routing fallback
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
