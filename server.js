const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dbConnect = require('./db');
const { Patient } = require('./model'); 
const session = require('express-session');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const secretKey = "mySuperSecretKey123"; 

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: false
}));


dbConnect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views')); 

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static("css"));

app.get('/plogin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'patientLogin.html'));
});
app.get('/dlogin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doctorLogin.html'));
});
app.get('/pregister', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/consult',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'consult.html'));
});
app.get('/prescribe',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prescription.html'));
});
app.get('/preshistory',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prescriptionHistory.html'));
});
app.get('/phistory',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doctorPresHistory.html'));
});

app.get('/home', (req, res) => {
  const username = req.session.username;

  const loggedIn = username ? true : false;

  res.render('home', { username, loggedIn }); 
}); 

app.get('/dhome', (req, res) => {
  const username = req.session.username;

  const loggedIn = username ? true : false;

  res.render('dhome', { username, loggedIn }); 
}); 

app.get('/doctor',requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doctor_dashboard.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/home'); 
  });
});
app.get('/dlogout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/dhome'); 
  });
});

app.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const newPatient = new Patient({
      firstName,
      lastName,
      email,
      password,
    });

    await newPatient.save();

    res.redirect('/plogin?success=true');
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const patient = await Patient.findOne({ email, userType: 'patient' });

    if (!patient) {
        return showToast('User not found', 'danger', res);
    }

    if (patient.password !== password) {
        return showToast('Incorrect password', 'danger', res);
    }

    req.session.username = patient.firstName;

    showToast('Login successful', 'success', res);
} catch (error) {
    console.error(error);
    showToast('Login failed', 'danger', res);
}
});

app.post('/doctorlogin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const patient = await Patient.findOne({ email, userType: 'doctor' });

    if (!patient) {
        return showToast('User not found', 'danger', res);
    }

    if (patient.password !== password) {
        return showToast('Incorrect password', 'danger', res);
    }

    req.session.username = patient.firstName;

    showToast('Login successful', 'success', res);
} catch (error) {
    console.error(error);
    showToast('Login failed', 'danger', res);
}
});

app.get('/api/getPatientDetails', async (req, res) => {
  try {
    const consultations = await Consultation.find(
      {}, 'patientName chiefComplaint symptomsDescription symptomsOnset symptomsSeverity recentChanges timestamp');
    res.json(consultations);
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ error: 'An error occurred while fetching patient details.' });
  }
});

app.get('/api/getPatientPrescriptions', async (req, res) => {
  try {
      const prescriptions = await Consultation.find({}, 'patientName chiefComplaint prescription');
      res.json(prescriptions); 
  } catch (error) {
      console.error('Error fetching patient prescriptions:', error);
      res.status(500).json({ error: 'An error occurred while fetching patient prescriptions.' });
  }
});

function showToast(message, type, res) {
  res.send({ success: type === 'success', message }); 
}


const PatientConsult = mongoose.model('PatientConsult', {
  name: String,
  consultationCount: {
      type: Number,
      default: 0,
  },
});

const Consultation = mongoose.model('Consultation', {
  patientName: String,
  chiefComplaint : String,
  symptomsDescription: String,
  symptomsOnset: String,
  symptomsSeverity: String,
  recentChanges: String,
  prescription: String, 
  timestamp: {
    type: String, 
    default: new Date().toLocaleString(), 
  },
});



app.use(bodyParser.json());

app.post('/api/requestConsultation', async (req, res) => {
    try {
      const {
        patientName,
        chiefComplaint,
        symptomsDescription,
        symptomsOnset,
        symptomsSeverity,
        recentChanges
      } = req.body;

        const consultation = new Consultation({
                    patientName,
                    chiefComplaint,
                    symptomsDescription,
                    symptomsOnset,
                    symptomsSeverity,
                    recentChanges
        });        
        await consultation.save();

        const patient = await PatientConsult.findOne({ name: patientName });
        if (patient) {
            patient.consultationCount += 1;
            await patient.save();
        }

        res.status(201).json({ message: 'Consultation requested successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/providePrescription', async (req, res) => {
    try {
        const { patientName, prescription } = req.body;

        const consultation = await Consultation.findOneAndUpdate(
            { patientName },
            { prescription },
            { new: true }
        );

        if (!consultation) {
          return sendResponse(false, 'Consultation not found', null, res);
        }

        sendResponse(true, 'Prescription provided successfully', consultation, res);
    } catch (error) {
        console.error('Error:', error);
        sendResponse(false, 'Server error', null, res);
    }
});

function sendResponse(success, message, data, res) {
  res.status(success ? 200 : 500).json({ success, message, data });
}

function requireLogin(req, res, next) {
  if (req.session.username) {
    next();
  } else {
    res.redirect('/plogin'); 
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});