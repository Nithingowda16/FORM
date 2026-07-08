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
      const date = new Date(s.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
      });

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

    // Show modal
    modalOverlay.classList.add('active');
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

  // --- Event Listeners for Filters & Controls ---
  searchInput.addEventListener('input', renderTable);
  filterStatus.addEventListener('change', renderTable);
  filterBranch.addEventListener('change', renderTable);
  filterPackage.addEventListener('change', renderTable);
  btnRefresh.addEventListener('click', fetchStudents);

  // Initial Fetch
  fetchStudents();
});
