document.addEventListener('DOMContentLoaded', () => {
  let students = [];
  let selectedStudent = null;

  // Selectors
  const adminTbody = document.getElementById('admin-tbody');
  const searchInput = document.getElementById('admin-search');
  const filterStatus = document.getElementById('filter-status');
  const filterBranch = document.getElementById('filter-branch');
  const filterPackage = document.getElementById('filter-package');
  const btnRefresh = document.getElementById('btn-refresh');

  // Stats Card Selectors
  const statTotal = document.getElementById('stat-total');
  const statPending = document.getElementById('stat-pending');
  const statApproved = document.getElementById('stat-approved');
  const statRejected = document.getElementById('stat-rejected');

  // Modal Selectors
  const modalOverlay = document.getElementById('student-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalStatusBadge = document.getElementById('modal-status-badge');

  // Action Buttons
  const btnApprove = document.getElementById('btn-action-approve');
  const btnReject = document.getElementById('btn-action-reject');
  const btnHold = document.getElementById('btn-action-hold');

  // --- Fetch Data ---
  function fetchStudents() {
    adminTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
          <p>Fetching student registrations...</p>
        </td>
      </tr>
    `;

    fetch('/api/admin/students')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          students = data.students || [];
          updateStats();
          populateBranchFilter();
          renderTable();
        } else {
          adminTbody.innerHTML = `
            <tr>
              <td colspan="8" style="text-align: center; color: var(--color-rejected); padding: 2rem;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                <p>Failed to retrieve registrations: ${data.message}</p>
              </td>
            </tr>
          `;
        }
      })
      .catch(err => {
        console.error('Error fetching students:', err);
        adminTbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--color-rejected); padding: 2rem;">
              <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
              <p>Error connecting to backend server. Make sure node server.js is running.</p>
            </td>
          </tr>
        `;
      });
  }

  // --- Statistics Logic ---
  function updateStats() {
    statTotal.textContent = students.length;
    
    const pending = students.filter(s => s.status === 'Pending').length;
    const approved = students.filter(s => s.status === 'Approved').length;
    const rejectedOrHold = students.filter(s => s.status === 'Rejected' || s.status === 'Hold').length;
    
    statPending.textContent = pending;
    statApproved.textContent = approved;
    statRejected.textContent = rejectedOrHold;
  }

  // --- Branch Filter Populate ---
  function populateBranchFilter() {
    const branches = new Set();
    students.forEach(s => {
      if (s.studentDetails && s.studentDetails.branch) {
        branches.add(s.studentDetails.branch);
      }
    });

    // Save current selected value
    const currentSelection = filterBranch.value;

    filterBranch.innerHTML = '<option value="All">All Branches</option>';
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      filterBranch.appendChild(opt);
    });

    // Restore selected value if still exists
    if (branches.has(currentSelection)) {
      filterBranch.value = currentSelection;
    }
  }

  // --- Filter and Render Table ---
  function renderTable() {
    const searchVal = searchInput.value.toLowerCase().trim();
    const statusVal = filterStatus.value;
    const branchVal = filterBranch.value;
    const packageVal = filterPackage.value;

    const filtered = students.filter(s => {
      const details = s.studentDetails || {};
      const pack = s.packageSelection || {};
      const pay = s.paymentDetails || {};
      
      // Search check
      const matchesSearch = 
        s.id.toLowerCase().includes(searchVal) ||
        (details.fullName && details.fullName.toLowerCase().includes(searchVal)) ||
        (details.usn && details.usn.toLowerCase().includes(searchVal)) ||
        (details.collegeName && details.collegeName.toLowerCase().includes(searchVal)) ||
        (details.email && details.email.toLowerCase().includes(searchVal));

      // Status check
      const matchesStatus = (statusVal === 'All') || (s.status === statusVal);

      // Branch check
      const matchesBranch = (branchVal === 'All') || (details.branch === branchVal);

      // Package check
      const matchesPackage = (packageVal === 'All') || (pack.packageName && pack.packageName.includes(packageVal));

      return matchesSearch && matchesStatus && matchesBranch && matchesPackage;
    });

    if (filtered.length === 0) {
      adminTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
            <i class="fa-solid fa-folder-open" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
            No registrations match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    adminTbody.innerHTML = '';
    
    // Sort so newest is on top
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Helper to generate initials from name
    const getInitials = (nameStr) => {
      if (!nameStr) return 'N/A';
      return nameStr.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    // Helper to generate dynamic background color for initials
    const getAvatarBg = (nameStr) => {
      const colors = ['#e8f0fe', '#e6f4ea', '#fce8e6', '#fef7e0', '#f3e8fd', '#e4f7fb'];
      let hash = 0;
      for (let i = 0; i < nameStr.length; i++) {
        hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    filtered.forEach(s => {
      const tr = document.createElement('tr');
      
      const id = s.id;
      const name = s.studentDetails.fullName || 'N/A';
      const email = s.studentDetails.email || 'N/A';
      const collegeBranch = `${s.studentDetails.collegeName || 'N/A'} (${s.studentDetails.branch || 'N/A'})`;
      const packageName = s.packageSelection.packageName || 'Basic';
      const feeStatus = s.paymentDetails.registrationFeeStatus || 'Not Yet Paid';
      const status = s.status || 'Pending';
      const dateObj = new Date(s.createdAt);
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
      });
      const timeStr = dateObj.toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const date = `${dateStr} ${timeStr}`;

      const initials = getInitials(name);
      const avatarBg = getAvatarBg(name);
      // Dark color matching the bg
      const avatarTextColor = '#0b57d0';

      tr.innerHTML = `
        <td style="font-family: monospace; font-weight:600; font-size:0.8rem; color:var(--primary);">${id}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="avatar-circle" style="background: ${avatarBg}; color: ${avatarTextColor}; font-weight: 700; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-family: var(--font-title); border: 1px solid rgba(0,0,0,0.04);">${initials}</div>
            <div>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${name}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem;">${email}</div>
            </div>
          </div>
        </td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${collegeBranch}</td>
        <td>${packageName}</td>
        <td>
          <span style="font-size: 0.8rem; font-weight: 500; color: ${feeStatus === 'Paid' ? 'var(--color-approved)' : 'var(--color-pending)'}">
            ${feeStatus}
          </span>
        </td>
        <td><span class="status-badge ${status}">${status}</span></td>
        <td>${date}</td>
        <td>
          <button type="button" class="btn-secondary-outline btn-view-details" data-id="${id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
            <i class="fa-solid fa-eye"></i> View Details
          </button>
        </td>
      `;

      tr.querySelector('.btn-view-details').addEventListener('click', () => {
        openStudentDetailsModal(s);
      });

      adminTbody.appendChild(tr);
    });
  }

  // --- Modal Controllers ---

  function openStudentDetailsModal(student) {
    selectedStudent = student;
    
    // Header
    document.getElementById('modal-student-name').textContent = student.studentDetails.fullName || 'Student Details';
    document.getElementById('modal-student-id').textContent = student.id;
    
    // Status Badge
    modalStatusBadge.className = `status-badge ${student.status}`;
    modalStatusBadge.textContent = student.status;

    // Section 1: Personal Details
    document.getElementById('val-fullName').textContent = student.studentDetails.fullName || '-';
    document.getElementById('val-email').textContent = student.studentDetails.email || '-';
    document.getElementById('val-mobile').textContent = student.studentDetails.mobile || '-';
    document.getElementById('val-whatsapp').textContent = student.studentDetails.whatsapp || '-';
    document.getElementById('val-collegeName').textContent = student.studentDetails.collegeName || '-';
    document.getElementById('val-university').textContent = student.studentDetails.university || '-';
    document.getElementById('val-branch-sem').textContent = `${student.studentDetails.branch || '-'} (${student.studentDetails.currentSemester || '-'} Sem)`;
    document.getElementById('val-usn').textContent = student.studentDetails.usn || '-';
    document.getElementById('val-dob-gender').textContent = `${student.studentDetails.dob || 'Not provided'} | ${student.studentDetails.gender || '-'}`;
    document.getElementById('val-city').textContent = student.studentDetails.currentCity || '-';

    // Section 2: Academic Backlogs
    document.getElementById('val-backlogsCount').textContent = student.academicDetails.subjectsNotClearedCount || '4';
    
    // Render Backlog mini table
    const modalSubjectsTbody = document.getElementById('modal-subjects-tbody');
    modalSubjectsTbody.innerHTML = '';
    const subjectsList = student.academicDetails.subjectsList || [];
    
    if (subjectsList.length === 0) {
      modalSubjectsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No backlog subjects detailed.</td></tr>';
    } else {
      subjectsList.forEach(sub => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 0.5rem;">${sub.semester} Sem</td>
          <td style="padding: 0.5rem; font-family: monospace;">${sub.subjectCode}</td>
          <td style="padding: 0.5rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sub.subjectName}</td>
          <td style="padding: 0.5rem; text-align: center;">${sub.attempts}</td>
          <td style="padding: 0.5rem; text-align: center;">${sub.appearing}</td>
        `;
        modalSubjectsTbody.appendChild(tr);
      });
    }

    // Section 3: Package
    document.getElementById('val-package').textContent = student.packageSelection.packageName || '-';

    // Section 4: Learning
    document.getElementById('val-device-net').textContent = `${student.learningDetails.device || '-'} / ${student.learningDetails.internet || '-'}`;
    document.getElementById('val-batch').textContent = student.learningDetails.preferredBatch || '-';

    // Section 5: Payment Info
    document.getElementById('val-feeStatus').textContent = student.paymentDetails.registrationFeeStatus || '-';
    document.getElementById('val-emiOption').textContent = student.paymentDetails.remainingFeeOption || '-';
    document.getElementById('val-transactionId').textContent = student.paymentDetails.transactionId || '-';
    document.getElementById('val-amountPaid').textContent = student.paymentDetails.amountPaid ? `INR ${student.paymentDetails.amountPaid}` : '-';

    // Section 8: Signature
    document.getElementById('val-signature').textContent = student.agreement.signature || '-';
    document.getElementById('val-dateSigned').textContent = student.agreement.date || '-';

    // Setup Documents checker links & previews
    setupFileLink('payment', student.paymentDetails.paymentScreenshot);
    setupFileLink('marks', student.documents.marksCard);
    setupFileLink('id', student.documents.studentIdCard);

    // Reset Visualizer panel
    resetVisualizer();

    // Toggle Print Receipt button visibility based on payment status
    const btnPrint = document.getElementById('btn-action-print');
    if (btnPrint) {
      if (student.paymentDetails.registrationFeeStatus === 'Paid') {
        btnPrint.style.display = 'inline-block';
      } else {
        btnPrint.style.display = 'none';
      }
    }

    // Show modal
    modalOverlay.classList.add('active');
  }

  // Helper function to print payment receipt
  function printReceipt(student) {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this portal to print receipts.');
      return;
    }
    
    const dateObj = new Date(student.createdAt);
    const dateStr = dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt_${student.id}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
          }
          .receipt-container {
            max-width: 700px;
            margin: 0 auto;
            border: 1px solid #e0e2e0;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0b57d0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-section h2 {
            color: #0b57d0;
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
          }
          .logo-section p {
            margin: 4px 0 0 0;
            font-size: 0.85rem;
            color: #5f6368;
          }
          .status-paid {
            background: #e6f4ea;
            color: #137333;
            padding: 6px 16px;
            border-radius: 100px;
            font-weight: 700;
            font-size: 0.85rem;
            text-transform: uppercase;
            border: 1px solid rgba(19, 115, 51, 0.2);
            display: inline-block;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
          }
          .details-col h4 {
            margin: 0 0 10px 0;
            color: #5f6368;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e0e2e0;
            padding-bottom: 4px;
          }
          .details-col p {
            margin: 4px 0;
            font-size: 0.9rem;
          }
          .details-col p strong {
            color: #1c1b1f;
          }
          .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .item-table th {
            background: #f8fafc;
            text-align: left;
            padding: 12px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #5f6368;
            text-transform: uppercase;
            border-bottom: 1px solid #e0e2e0;
          }
          .item-table td {
            padding: 14px 12px;
            border-bottom: 1px solid #e0e2e0;
            font-size: 0.9rem;
          }
          .total-section {
            display: flex;
            justify-content: flex-end;
            font-size: 1.15rem;
            font-weight: 700;
            color: #1c1b1f;
            margin-top: 20px;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #e0e2e0;
            padding-top: 20px;
            text-align: center;
            font-size: 0.75rem;
            color: #5f6368;
          }
          @media print {
            body {
              padding: 0;
            }
            .receipt-container {
              border: none;
              box-shadow: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="logo-section">
              <h2>Coaching Portal</h2>
              <p>Registration & Seat Reservation Receipt</p>
            </div>
            <div class="status-paid">Paid</div>
          </div>

          <div class="details-grid">
            <div class="details-col">
              <h4>Receipt Details</h4>
              <p><strong>Receipt ID:</strong> REC-${student.id.split('-').slice(1).join('-')}</p>
              <p><strong>Date & Time:</strong> ${dateStr}, ${timeStr}</p>
              <p><strong>Registration ID:</strong> ${student.id}</p>
            </div>
            <div class="details-col">
              <h4>Billed To</h4>
              <p><strong>Name:</strong> ${student.studentDetails.fullName}</p>
              <p><strong>USN:</strong> ${student.studentDetails.usn}</p>
              <p><strong>College:</strong> ${student.studentDetails.collegeName}</p>
              <p><strong>Email:</strong> ${student.studentDetails.email}</p>
            </div>
          </div>

          <table class="item-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Transaction Reference</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Seat Reservation Fee</strong><br>
                  <span style="font-size: 0.78rem; color: #5f6368;">6-Month Coaching Cohort (${student.packageSelection.packageName || 'GO - ₹14,999'})</span>
                </td>
                <td style="font-family: monospace;">
                  ${student.paymentDetails.transactionId || 'N/A'}
                </td>
                <td style="text-align: right; font-weight: 600;">
                  ₹${parseFloat(student.paymentDetails.amountPaid || 10000).toLocaleString('en-IN')}.00
                </td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            Total Paid: &nbsp; <span style="color: #0b57d0;">₹${parseFloat(student.paymentDetails.amountPaid || 10000).toLocaleString('en-IN')}.00</span>
          </div>

          <div class="footer">
            <p>Thank you for your enrollment. We look forward to helping you master your subjects!</p>
            <p style="color: #9aa0a6; margin-top: 10px;">This is a system-generated official payment confirmation and receipt.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  }

  function setupFileLink(fileType, fileObject) {
    const linkEl = document.getElementById(`file-link-${fileType}`);
    const nameEl = document.getElementById(`file-name-${fileType}`);
    
    if (fileObject && fileObject.path) {
      linkEl.href = fileObject.path;
      linkEl.classList.remove('disabled');
      linkEl.style.opacity = '1';
      linkEl.style.pointerEvents = 'auto';
      nameEl.textContent = fileObject.originalName;
      
      // Add custom click event to visualize file in-modal
      linkEl.onclick = (e) => {
        e.preventDefault();
        visualizeFile(fileObject.path, fileObject.originalName);
      };
    } else {
      linkEl.href = '#';
      linkEl.classList.add('disabled');
      linkEl.style.opacity = '0.5';
      linkEl.style.pointerEvents = 'none';
      nameEl.textContent = fileType === 'id' ? 'No Student ID uploaded' : 'Not uploaded';
      linkEl.onclick = null;
    }
  }

  // --- Visualizer Controller ---
  const visualizerPlaceholder = document.getElementById('visualizer-placeholder');
  const visualizerImg = document.getElementById('visualizer-img');
  const visualizerIframe = document.getElementById('visualizer-iframe');

  function resetVisualizer() {
    visualizerPlaceholder.style.display = 'flex';
    visualizerImg.style.display = 'none';
    visualizerImg.src = '';
    visualizerIframe.style.display = 'none';
    visualizerIframe.src = '';
  }

  function visualizeFile(filePath, fileName) {
    resetVisualizer();
    visualizerPlaceholder.style.display = 'none';
    
    const ext = filePath.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
      visualizerIframe.src = filePath;
      visualizerIframe.style.display = 'block';
    } else {
      // Treat as image
      visualizerImg.src = filePath;
      visualizerImg.style.display = 'block';
    }
  }

  // Close modal handler
  function closeModal() {
    modalOverlay.classList.remove('active');
    selectedStudent = null;
    resetVisualizer();
  }
  
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // --- Status Update API calls ---
  function updateStudentStatus(newStatus) {
    if (!selectedStudent) return;
    
    const studentId = selectedStudent.id;
    
    // Disable buttons
    btnApprove.disabled = true;
    btnReject.disabled = true;
    btnHold.disabled = true;

    fetch(`/api/admin/students/${studentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => res.json())
      .then(data => {
        btnApprove.disabled = false;
        btnReject.disabled = false;
        btnHold.disabled = false;

        if (data.success) {
          // Update status locally in state
          const index = students.findIndex(s => s.id === studentId);
          if (index !== -1) {
            students[index].status = newStatus;
          }
          
          // Update modal view badge
          modalStatusBadge.className = `status-badge ${newStatus}`;
          modalStatusBadge.textContent = newStatus;
          
          // Re-render table and stats
          updateStats();
          renderTable();
          
          alert(`Application status updated to: ${newStatus}`);
        } else {
          alert(`Failed to update status: ${data.message}`);
        }
      })
      .catch(err => {
        btnApprove.disabled = false;
        btnReject.disabled = false;
        btnHold.disabled = false;
        console.error('Error updating status:', err);
        alert('Network error occurred while updating status. Please try again.');
      });
  }

  btnApprove.addEventListener('click', () => updateStudentStatus('Approved'));
  btnReject.addEventListener('click', () => updateStudentStatus('Rejected'));
  btnHold.addEventListener('click', () => updateStudentStatus('Hold'));

  // Print receipt event listener
  const btnPrintReceipt = document.getElementById('btn-action-print');
  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener('click', () => {
      if (selectedStudent) {
        printReceipt(selectedStudent);
      }
    });
  }

  // --- Event Listeners for Filters & Controls ---
  searchInput.addEventListener('input', renderTable);
  filterStatus.addEventListener('change', renderTable);
  filterBranch.addEventListener('change', renderTable);
  filterPackage.addEventListener('change', renderTable);
  btnRefresh.addEventListener('click', fetchStudents);

  // Initial Fetch
  fetchStudents();
});
