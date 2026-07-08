document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = 8;
  const form = document.getElementById('registration-form');
  
  // Element selections
  const btnNext = document.getElementById('btn-next');
  const btnBack = document.getElementById('btn-back');
  const stepHelperText = document.getElementById('step-helper-txt');
  const currentStepNumSpan = document.getElementById('current-step-num');
  const stepsProgressBar = document.getElementById('steps-progress');
  const heroLanding = document.getElementById('hero-landing-page');
  const successScreen = document.getElementById('success-screen');
  const successStudentId = document.getElementById('success-student-id');
  
  // Handle Reserve my seat CTA click to show form
  const btnLandingReserve = document.getElementById('btn-landing-reserve');
  const wizardSection = document.getElementById('registration-wizard-section');
  
  if (btnLandingReserve && wizardSection) {
    btnLandingReserve.addEventListener('click', () => {
      wizardSection.classList.add('active');
      // Scroll to the wizard section
      setTimeout(() => {
        wizardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  }
  
  // Set default date in Section 8
  const agreementDateInput = document.getElementById('agreementDate');
  if (agreementDateInput) {
    const today = new Date().toISOString().split('T')[0];
    agreementDateInput.value = today;
  }

  // --- Step Navigation Logic ---
  
  function updateProgressBar() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    if (stepsProgressBar) {
      stepsProgressBar.style.width = `${percentage}%`;
    }
    
    // Update step node classes
    document.querySelectorAll('.step-node').forEach(node => {
      const nodeStep = parseInt(node.getAttribute('data-step'), 10);
      node.classList.remove('active', 'completed');
      if (nodeStep === currentStep) {
        node.classList.add('active');
      } else if (nodeStep < currentStep) {
        node.classList.add('completed');
      }
    });

    // Update vertical step item classes (sidebar)
    document.querySelectorAll('.step-item').forEach(item => {
      const itemStep = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (itemStep === currentStep) {
        item.classList.add('active');
      } else if (itemStep < currentStep) {
        item.classList.add('completed');
      }
    });

    // Update sidebar indicator text
    const sidebarStepIndicator = document.getElementById('sidebar-step-indicator');
    if (sidebarStepIndicator) {
      sidebarStepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
    }
  }

  function showStep(step) {
    document.querySelectorAll('.step-content').forEach(content => {
      content.classList.remove('active');
    });
    const activeContent = document.querySelector(`.step-content[data-step="${step}"]`);
    if (activeContent) {
      activeContent.classList.add('active');
    }

    if (currentStepNumSpan) {
      currentStepNumSpan.textContent = step;
    }
    
    // Footer button configuration
    if (step === 1) {
      btnBack.disabled = true;
    } else {
      btnBack.disabled = false;
    }

    if (step === totalSteps) {
      btnNext.innerHTML = 'Submit Application <i class="fa-solid fa-check"></i>';
    } else {
      btnNext.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
    }

    updateProgressBar();
    window.scrollTo({ top: 150, behavior: 'smooth' });
  }

  // Next and Back Click Handlers
  btnNext.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
      } else {
        submitForm();
      }
    }
  });

  btnBack.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  // Allow clicking on completed nodes/items to jump back
  const registerStepJump = (el) => {
    el.addEventListener('click', () => {
      const targetStep = parseInt(el.getAttribute('data-step'), 10);
      // Can only click if it is less than current step or we already validated everything in between
      if (targetStep < currentStep) {
        currentStep = targetStep;
        showStep(currentStep);
      }
    });
  };
  document.querySelectorAll('.step-node').forEach(registerStepJump);
  document.querySelectorAll('.step-item').forEach(registerStepJump);

  // --- Step Validation Logic ---
  
  function validateStep(step) {
    const activePanel = document.querySelector(`.step-content[data-step="${step}"]`);
    const requiredInputs = activePanel.querySelectorAll('[required]');
    let isValid = true;
    
    // Remove previous errors
    activePanel.querySelectorAll('.error-msg').forEach(el => el.remove());
    activePanel.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));

    requiredInputs.forEach(input => {
      if (input.type === 'checkbox' && !input.checked) {
        isValid = false;
        markInputInvalid(input, 'This checkbox is required');
      } else if (input.type === 'radio') {
        const name = input.name;
        const checkedRadio = activePanel.querySelector(`input[name="${name}"]:checked`);
        if (!checkedRadio) {
          isValid = false;
          markInputInvalid(input, 'Please select one option');
        }
      } else if (!input.value.trim()) {
        isValid = false;
        markInputInvalid(input, 'This field is required');
      } else {
        // Specific checks
        if (input.type === 'email' && !validateEmail(input.value)) {
          isValid = false;
          markInputInvalid(input, 'Please enter a valid email address');
        }
        if (input.name === 'mobile' || input.name === 'whatsapp') {
          if (!/^\d{10}$/.test(input.value.replace(/[^0-9]/g, ""))) {
            isValid = false;
            markInputInvalid(input, 'Please enter a valid 10-digit number');
          }
        }
      }
    });

    // Step 2 specific: subject code and subject name fields in table
    if (step === 2) {
      const subjectRows = document.querySelectorAll('.subject-row');
      subjectRows.forEach(row => {
        const codeInput = row.querySelector('.sub-code');
        const nameInput = row.querySelector('.sub-name');
        
        if (!codeInput.value.trim()) {
          isValid = false;
          codeInput.classList.add('invalid-input');
        }
        if (!nameInput.value.trim()) {
          isValid = false;
          nameInput.classList.add('invalid-input');
        }
      });
      if (!isValid) {
        alert("Please fill out all fields in the subjects list.");
      }
    }

    // Step 5 specific: validation of transaction ID / payment screenshot
    if (step === 5) {
      const statusPaid = document.querySelector('input[name="registrationFeeStatus"]:checked').value === 'Paid';
      const fileInput = document.getElementById('paymentScreenshot');
      const transactionInput = document.getElementById('transactionId');
      
      if (statusPaid) {
        if (!transactionInput.value.trim()) {
          isValid = false;
          markInputInvalid(transactionInput, 'Transaction ID is required when status is Paid');
        }
        if (!fileInput.files || fileInput.files.length === 0) {
          isValid = false;
          const uploader = document.getElementById('wrapper-paymentScreenshot');
          uploader.style.borderColor = 'var(--color-rejected)';
          alert("Payment receipt screenshot is required.");
        }
      }
    }

    // Step 6 specific: marks card required
    if (step === 6) {
      const marksCardFile = document.getElementById('marksCard');
      if (!marksCardFile.files || marksCardFile.files.length === 0) {
        isValid = false;
        const uploader = document.getElementById('wrapper-marksCard');
        uploader.style.borderColor = 'var(--color-rejected)';
        alert("Latest marks card is required.");
      }
    }

    return isValid;
  }

  function markInputInvalid(input, message) {
    input.classList.add('invalid-input');
    
    // Add border alert color
    input.style.borderColor = 'var(--color-rejected)';
    
    // Create text error under
    const err = document.createElement('span');
    err.className = 'error-msg';
    err.style.color = 'var(--color-rejected)';
    err.style.fontSize = '0.75rem';
    err.style.marginTop = '0.25rem';
    err.innerText = message;
    
    if (input.type === 'checkbox') {
      input.closest('label').appendChild(err);
    } else if (input.type === 'radio') {
      input.closest('.radio-card-grid').appendChild(err);
    } else {
      input.parentNode.appendChild(err);
    }

    // Reset styles on key input
    input.addEventListener('input', () => {
      input.style.borderColor = '';
      err.remove();
    }, { once: true });
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  // --- Dynamic Subjects List Logic ---
  
  const subjectsTbody = document.getElementById('subjects-tbody');
  const btnAddSubject = document.getElementById('btn-add-subject');

  function createSubjectRow() {
    const tr = document.createElement('tr');
    tr.className = 'subject-row';
    tr.innerHTML = `
      <td>
        <select class="sub-sem" required>
          <option value="1">1st Sem</option>
          <option value="2">2nd Sem</option>
          <option value="3">3rd Sem</option>
          <option value="4">4th Sem</option>
          <option value="5">5th Sem</option>
          <option value="6">6th Sem</option>
          <option value="7">7th Sem</option>
          <option value="8">8th Sem</option>
        </select>
      </td>
      <td>
        <input type="text" class="sub-code" required placeholder="e.g. 21CS31">
      </td>
      <td>
        <input type="text" class="sub-name" required placeholder="e.g. Mathematics-III">
      </td>
      <td>
        <input type="number" class="sub-attempts" required min="1" value="1">
      </td>
      <td>
        <select class="sub-appearing">
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </td>
      <td>
        <button type="button" class="btn-remove-row">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;

    // Add remove logic
    tr.querySelector('.btn-remove-row').addEventListener('click', () => {
      const rowCount = subjectsTbody.querySelectorAll('.subject-row').length;
      if (rowCount > 1) {
        tr.remove();
      } else {
        alert("At least one subject must be added to the backlog checklist.");
      }
    });

    subjectsTbody.appendChild(tr);
  }

  // Register click for add button
  btnAddSubject.addEventListener('click', createSubjectRow);

  // Setup initial row's trash button
  const initialTrash = subjectsTbody.querySelector('.btn-remove-row');
  if (initialTrash) {
    initialTrash.addEventListener('click', (e) => {
      const rowCount = subjectsTbody.querySelectorAll('.subject-row').length;
      if (rowCount > 1) {
        e.target.closest('.subject-row').remove();
      } else {
        alert("At least one subject must be added to the backlog checklist.");
      }
    });
  }

  // --- Package Selection Card Listeners ---
  
  const packageCards = document.querySelectorAll('.package-card');
  const packageNameInput = document.getElementById('packageName');

  packageCards.forEach(card => {
    card.addEventListener('click', () => {
      packageCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const chosenPackage = card.getAttribute('data-package');
      packageNameInput.value = chosenPackage;
    });
  });

  // --- EMI Option Policy Warning Alert Toggler ---
  const remainingFeeSelect = document.getElementById('remainingFeeOption');
  const emiPolicyAlert = document.getElementById('emi-policy-alert');

  if (remainingFeeSelect && emiPolicyAlert) {
    const checkEmiOption = () => {
      if (remainingFeeSelect.value.includes('EMI')) {
        emiPolicyAlert.style.display = 'block';
      } else {
        emiPolicyAlert.style.display = 'none';
      }
    };
    remainingFeeSelect.addEventListener('change', checkEmiOption);
    checkEmiOption(); // run once on initialization
  }

  // --- Drag and Drop File Handlers ---
  
  const fileInputs = ['paymentScreenshot', 'marksCard', 'studentIdCard'];
  
  fileInputs.forEach(id => {
    const inputElement = document.getElementById(id);
    const wrapper = document.getElementById(`wrapper-${id}`);
    const preview = document.getElementById(`preview-${id}`);
    
    if (!inputElement || !wrapper) return;


    inputElement.addEventListener('change', () => {
      handleFileSelected(inputElement.files[0], id);
    });

    // Drag-over styling
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      wrapper.classList.add('dragover');
    });

    wrapper.addEventListener('dragleave', () => {
      wrapper.classList.remove('dragover');
    });

    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        inputElement.files = e.dataTransfer.files;
        handleFileSelected(e.dataTransfer.files[0], id);
      }
    });
  });

  function handleFileSelected(file, fieldId) {
    const wrapper = document.getElementById(`wrapper-${fieldId}`);
    const preview = document.getElementById(`preview-${fieldId}`);
    
    if (!file) {
      wrapper.style.display = 'block';
      preview.style.display = 'none';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      removeUploadedFile(fieldId);
      return;
    }

    // Show preview and hide upload card
    wrapper.style.display = 'none';
    preview.style.display = 'flex';
    preview.querySelector('.file-preview-name').textContent = file.name;
    // reset border color
    wrapper.style.borderColor = '';
  }

  // Global handle remove file (referenced in html inline)
  window.removeUploadedFile = function(fieldId) {
    const input = document.getElementById(fieldId);
    const wrapper = document.getElementById(`wrapper-${fieldId}`);
    const preview = document.getElementById(`preview-${fieldId}`);
    
    input.value = "";
    wrapper.style.display = 'block';
    preview.style.display = 'none';
  };

  // --- Form Submission ---
  
  function submitForm() {
    btnNext.disabled = true;
    btnNext.innerHTML = 'Submitting... <i class="fa-solid fa-spinner fa-spin"></i>';

    const formData = new FormData();

    // 1. Gather Section 1 Personal Details
    formData.append('fullName', document.getElementById('fullName').value);
    formData.append('mobile', document.getElementById('mobile').value);
    formData.append('whatsapp', document.getElementById('whatsapp').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('dob', document.getElementById('dob').value);
    formData.append('gender', document.querySelector('input[name="gender"]:checked').value);
    formData.append('collegeName', document.getElementById('collegeName').value);
    formData.append('university', document.getElementById('university').value);
    formData.append('branch', document.getElementById('branch').value);
    formData.append('currentSemester', document.getElementById('currentSemester').value);
    formData.append('usn', document.getElementById('usn').value);
    formData.append('currentCity', document.getElementById('currentCity').value);

    // 2. Gather Section 2 Academic Details
    formData.append('subjectsNotClearedCount', document.getElementById('subjectsNotClearedCount').value);
    
    // Parse subjects list rows
    const subjectsArray = [];
    document.querySelectorAll('.subject-row').forEach(row => {
      const sem = row.querySelector('.sub-sem').value;
      const code = row.querySelector('.sub-code').value;
      const name = row.querySelector('.sub-name').value;
      const attempts = row.querySelector('.sub-attempts').value;
      const appearing = row.querySelector('.sub-appearing').value;
      
      subjectsArray.push({
        semester: sem,
        subjectCode: code,
        subjectName: name,
        attempts: attempts,
        appearing: appearing
      });
    });
    formData.append('subjectsNotCleared', JSON.stringify(subjectsArray));

    // 3. Gather Section 3 Packages
    formData.append('packageName', packageNameInput.value);

    // 4. Gather Section 4 Learning preferences
    formData.append('device', document.querySelector('input[name="device"]:checked').value);
    formData.append('internet', document.querySelector('input[name="internet"]:checked').value);
    formData.append('preferredBatch', document.querySelector('input[name="preferredBatch"]:checked').value);

    // 5. Gather Section 5 Payment Details
    formData.append('remainingFeeOption', document.getElementById('remainingFeeOption').value);
    formData.append('registrationFeeStatus', document.querySelector('input[name="registrationFeeStatus"]:checked').value);
    formData.append('amountPaid', document.getElementById('amountPaid').value);
    formData.append('transactionId', document.getElementById('transactionId').value);
    
    const paymentFile = document.getElementById('paymentScreenshot').files[0];
    if (paymentFile) {
      formData.append('paymentScreenshot', paymentFile);
    }

    // 6. Gather Section 6 Documents
    const marksCardFile = document.getElementById('marksCard').files[0];
    if (marksCardFile) {
      formData.append('marksCard', marksCardFile);
    }
    const studentIdFile = document.getElementById('studentIdCard').files[0];
    if (studentIdFile) {
      formData.append('studentIdCard', studentIdFile);
    }

    // 8. Gather Section 8 Student Agreement details
    formData.append('candidateName', document.getElementById('candidateName').value);
    formData.append('signature', document.getElementById('signature').value);
    formData.append('agreementDate', document.getElementById('agreementDate').value);

    // Make AJAX POST request to server
    fetch('/api/register', {
      method: 'POST',
      body: formData
    })
    .then(async response => {
      if (!response.ok) {
        let errMsg = 'Registration API submission failed';
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Show success screen
        form.style.display = 'none';
        const stepsBar = document.getElementById('steps-indicator-bar');
        if (stepsBar) stepsBar.style.display = 'none';
        document.getElementById('wizard-navigation').style.display = 'none';
        if (heroLanding) heroLanding.style.display = 'none';
        
        // Hide sidebar stepper column
        const sidebar = document.querySelector('.sidebar-col');
        if (sidebar) sidebar.style.display = 'none';
        
        // Expand main card to full width
        const layout = document.querySelector('.registration-layout');
        if (layout) layout.style.gridTemplateColumns = '1fr';
        
        successStudentId.textContent = data.studentId;
        successScreen.style.display = 'block';
      } else {
        alert(data.message || 'Submission error occurred. Please try again.');
        btnNext.disabled = false;
        btnNext.innerHTML = 'Submit Application <i class="fa-solid fa-check"></i>';
      }
    })
    .catch(err => {
      console.error(err);
      alert(`Submission Error: ${err.message}\n\nPlease check your console for details, ensure all files are within the size limit, and try again.`);
      btnNext.disabled = false;
      btnNext.innerHTML = 'Submit Application <i class="fa-solid fa-check"></i>';
    });
  }

});
