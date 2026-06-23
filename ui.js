/**
 * ui.js — All DOM render functions
 *
 * CRITICAL: modals use BOTH hidden/flex toggle.
 * Open:  el.classList.remove('hidden'); el.classList.add('flex');
 * Close: el.classList.add('hidden');    el.classList.remove('flex');
 */

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Escape HTML to prevent XSS when inserting user data into innerHTML.
 */
export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Nav ───────────────────────────────────────────────────────────────────────

export function renderNav(state, els) {
  // GramJS status badge
  if (els.gramBadge) {
    if (state.gramLoading) {
      els.gramBadge.className =
        'ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400';
      els.gramBadge.innerHTML =
        '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i>Loading GramJS…';
    } else if (state.gramError) {
      els.gramBadge.className =
        'ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400';
      els.gramBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1"></i>GramJS error';
    } else {
      els.gramBadge.className =
        'ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400';
      els.gramBadge.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i>GramJS ready';
    }
  }

  // Active account badge
  const activeAcc = state.accounts[state.activePhone];
  if (els.activeAccountBadge) {
    if (activeAcc) {
      els.activeAccountBadge.classList.remove('hidden');
      if (els.activeInitials) els.activeInitials.textContent = activeAcc.initials || '??';
      if (els.activeName) els.activeName.textContent = activeAcc.name || activeAcc.phone;
    } else {
      els.activeAccountBadge.classList.add('hidden');
    }
  }

  // Stats
  if (els.statGroups) els.statGroups.textContent = state.groups.length;
  if (els.statCandidates) els.statCandidates.textContent = state.candidates.length;
  if (els.statAccounts) els.statAccounts.textContent = Object.keys(state.accounts).length;
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

export function renderMenu(state, els) {
  if (!els.kebabMenu) return;
  els.kebabMenu.classList.toggle('hidden', !state.ui.menuOpen);

  // Account switcher inside menu
  if (els.menuAccountsList) {
    const accounts = Object.values(state.accounts);
    if (accounts.length === 0) {
      els.menuAccountsList.innerHTML =
        '<p class="px-3 py-1 text-xs text-slate-500">No accounts yet.</p>';
    } else {
      els.menuAccountsList.innerHTML = accounts
        .map(
          (acc) => `
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700 text-sm cursor-pointer ${
            acc.phone === state.activePhone ? 'text-blue-400' : 'text-slate-300'
          }" data-menu-activate="${escapeHtml(acc.phone)}">
            <span class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              ${escapeHtml(acc.initials || '??')}
            </span>
            <span class="flex-1 truncate">${escapeHtml(acc.name || acc.phone)}</span>
            ${acc.phone === state.activePhone ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
          </div>`
        )
        .join('');
    }
  }
}

// ── Accounts panel ────────────────────────────────────────────────────────────

export function renderAccounts(state, els, callbacks) {
  if (!els.accountsList) return;
  const accounts = Object.values(state.accounts);

  if (accounts.length === 0) {
    els.accountsList.innerHTML = `
      <div class="text-center text-slate-500 py-8 col-span-full">
        <i class="fa-solid fa-user-plus text-3xl mb-3 opacity-40"></i>
        <p>No accounts yet. Click "Add Account" to get started.</p>
      </div>`;
    return;
  }

  els.accountsList.innerHTML = accounts
    .map((acc) => {
      const isActive = acc.phone === state.activePhone;
      return `
      <div class="bg-[#1e293b] border ${
        isActive ? 'border-blue-500' : 'border-slate-600'
      } rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
          ${escapeHtml(acc.initials || '??')}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-white truncate">${escapeHtml(acc.name || acc.phone)}</div>
          <div class="text-xs text-slate-400 truncate">
            ${acc.username ? '@' + escapeHtml(acc.username) + ' · ' : ''}${escapeHtml(acc.phone)}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${
            isActive
              ? '<span class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Active</span>'
              : `<button data-activate="${escapeHtml(acc.phone)}" class="activate-btn px-3 py-1 bg-slate-700 hover:bg-blue-600 rounded-lg text-xs transition">Use</button>`
          }
          <button data-logout="${escapeHtml(acc.phone)}" class="logout-btn w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition">
            <i class="fa-solid fa-right-from-bracket text-xs"></i>
          </button>
        </div>
      </div>`;
    })
    .join('');

  // Bind buttons
  els.accountsList.querySelectorAll('.activate-btn').forEach((btn) => {
    btn.addEventListener('click', () => callbacks?.onActivate?.(btn.dataset.activate));
  });
  els.accountsList.querySelectorAll('.logout-btn').forEach((btn) => {
    btn.addEventListener('click', () => callbacks?.onLogout?.(btn.dataset.logout));
  });
}

// ── Groups grid ───────────────────────────────────────────────────────────────

export function renderGroups(state, els, callbacks) {
  if (!els.groupsGrid) return;

  if (!state.groups.length) {
    els.groupsGrid.innerHTML = `
      <div class="text-center text-slate-500 py-8 col-span-full">
        <i class="fa-solid fa-magnifying-glass text-3xl mb-3 opacity-40"></i>
        <p>Search for groups first.</p>
      </div>`;
    return;
  }

  els.groupsGrid.innerHTML = state.groups
    .map(
      (g) => `
      <label class="bg-[#1e293b] border ${
        g.selected ? 'border-blue-500' : 'border-slate-600'
      } rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:border-blue-400 transition select-none">
        <input type="checkbox" class="group-check mt-0.5" data-username="${escapeHtml(g.username)}" ${g.selected ? 'checked' : ''} />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-white truncate">${escapeHtml(g.title)}</div>
          <div class="text-xs text-slate-400">@${escapeHtml(g.username)}</div>
          <div class="text-xs text-slate-500 mt-0.5">
            <i class="fa-solid fa-users mr-1"></i>${_fmtNum(g.members)} members
          </div>
        </div>
      </label>`
    )
    .join('');

  els.groupsGrid.querySelectorAll('.group-check').forEach((cb) => {
    cb.addEventListener('change', () => callbacks?.onToggle?.(cb.dataset.username));
  });
}

// ── Candidates grid ───────────────────────────────────────────────────────────

export function renderCandidates(state, els, callbacks) {
  if (!els.candidatesGrid) return;

  if (!state.candidates.length) {
    els.candidatesGrid.innerHTML = `
      <div class="text-center text-slate-500 py-8 col-span-full">
        <i class="fa-solid fa-users text-3xl mb-3 opacity-40"></i>
        <p>Scan groups to find candidates.</p>
      </div>`;
    return;
  }

  els.candidatesGrid.innerHTML = state.candidates
    .map((c) => {
      const scoreColor = _scoreColor(c.score);
      return `
      <div class="bg-[#1e293b] border border-slate-600 rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="font-medium text-white truncate">${escapeHtml(c.username)}</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor} flex-shrink-0 ml-2">
            ${c.score}/100
          </span>
        </div>
        <div>
          <span class="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs">
            ${escapeHtml(c.category)}
          </span>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(c.reason)}</p>
        <button
          class="send-dm-btn mt-auto w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
          data-username="${escapeHtml(c.username)}">
          <i class="fa-solid fa-paper-plane text-xs"></i> Send DM
        </button>
      </div>`;
    })
    .join('');

  els.candidatesGrid.querySelectorAll('.send-dm-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lead = state.candidates.find((c) => c.username === btn.dataset.username);
      if (lead) callbacks?.onSendDm?.(lead);
    });
  });
}

// ── Login Modal ───────────────────────────────────────────────────────────────

/**
 * Render the login modal.
 * CRITICAL: toggle BOTH 'hidden' AND 'flex' classes.
 */
export function renderLoginModal(state, els) {
  if (!els.loginModal) return;

  // ── Modal visibility ──────────────────────────────────────────────────
  if (state.ui.loginOpen) {
    els.loginModal.classList.remove('hidden');
    els.loginModal.classList.add('flex');
  } else {
    els.loginModal.classList.add('hidden');
    els.loginModal.classList.remove('flex');
    return; // Nothing else to update when closed
  }

  const flow = state.authFlow;
  const step = flow?.step || 'phone';

  // ── Step visibility ───────────────────────────────────────────────────
  const showPhone = ['phone', 'sending'].includes(step);
  const showOtp = ['otp', 'verifying'].includes(step);
  const showPass = step === 'password';

  if (els.loginStepPhone) els.loginStepPhone.classList.toggle('hidden', !showPhone);
  if (els.loginStepOtp) els.loginStepOtp.classList.toggle('hidden', !showOtp);
  if (els.loginStepPassword) els.loginStepPassword.classList.toggle('hidden', !showPass);

  // ── Send OTP button ───────────────────────────────────────────────────
  // IMPORTANT: NEVER disabled while GramJS loads; only disabled during 'sending'
  if (els.sendOtpBtn) {
    const isSending = step === 'sending';
    els.sendOtpBtn.disabled = isSending;
    els.sendOtpBtn.innerHTML = isSending
      ? '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Connecting…'
      : '<i class="fa-solid fa-paper-plane mr-2"></i>Send OTP';
  }

  // ── Verify OTP button ─────────────────────────────────────────────────
  if (els.verifyOtpBtn) {
    const isVerifying = step === 'verifying';
    els.verifyOtpBtn.disabled = isVerifying;
    els.verifyOtpBtn.innerHTML = isVerifying
      ? '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Verifying…'
      : '<i class="fa-solid fa-check mr-2"></i>Verify OTP';
  }

  // ── Password button ───────────────────────────────────────────────────
  if (els.verifyPasswordBtn) {
    els.verifyPasswordBtn.disabled = false;
    els.verifyPasswordBtn.innerHTML =
      '<i class="fa-solid fa-lock-open mr-2"></i>Submit Password';
  }

  // ── Status box ────────────────────────────────────────────────────────
  if (els.loginStatus) {
    const STATUS = {
      phone: '',
      sending: 'Connecting to Telegram…',
      otp: '✅ OTP sent! Check your Telegram app or SMS.',
      verifying: 'Verifying OTP…',
      password: '🔐 2FA enabled. Enter your cloud password.',
      done: '✅ Login successful!',
      error: flow?.message || 'An error occurred.',
    };

    const msg = STATUS[step] || '';
    if (msg) {
      els.loginStatus.textContent = msg;
      els.loginStatus.classList.remove('hidden', 'text-red-400', 'text-green-400', 'text-slate-400', 'text-blue-400');
      if (step === 'error') els.loginStatus.classList.add('text-red-400');
      else if (step === 'done') els.loginStatus.classList.add('text-green-400');
      else if (step === 'otp') els.loginStatus.classList.add('text-green-400');
      else els.loginStatus.classList.add('text-blue-400');
    } else {
      els.loginStatus.classList.add('hidden');
    }
  }
}

// ── DM Modal ──────────────────────────────────────────────────────────────────

export function renderDmModal(state, els) {
  if (!els.dmModal) return;

  // ── Modal visibility ──────────────────────────────────────────────────
  if (state.ui.dmOpen) {
    els.dmModal.classList.remove('hidden');
    els.dmModal.classList.add('flex');
  } else {
    els.dmModal.classList.add('hidden');
    els.dmModal.classList.remove('flex');
    return;
  }

  // ── Candidate info ────────────────────────────────────────────────────
  const lead = state.dmLead;
  if (lead && els.dmCandidateInfo) {
    els.dmCandidateInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
          ${escapeHtml(lead.username?.[1]?.toUpperCase() || '?')}
        </div>
        <div>
          <div class="text-white font-medium">${escapeHtml(lead.username)}</div>
          <div class="text-xs flex gap-2 mt-0.5">
            <span class="text-slate-400">${escapeHtml(lead.category)}</span>
            <span class="${_scoreColor(lead.score)} font-bold">${lead.score}/100</span>
          </div>
        </div>
      </div>`;
  }
}

// ── Stepper ───────────────────────────────────────────────────────────────────

export function renderStepper(state, els) {
  if (!els.stepper) return;

  const hasAccounts = Object.keys(state.accounts).length > 0;
  const hasGroups = state.groups.length > 0;
  const hasCandidates = state.candidates.length > 0;

  const steps = [
    { label: 'Login', done: hasAccounts },
    { label: 'Find Groups', done: hasGroups },
    { label: 'Scan', done: hasCandidates },
    { label: 'Outreach', done: false },
  ];

  // Determine active step
  let activeIdx = 0;
  if (hasAccounts) activeIdx = 1;
  if (hasGroups) activeIdx = 2;
  if (hasCandidates) activeIdx = 3;

  els.stepper.innerHTML = steps
    .map((s, i) => {
      const isDone = s.done;
      const isActive = i === activeIdx && !isDone;
      const baseClasses = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap';
      let classes;
      if (isDone) {
        classes = `${baseClasses} bg-green-500/20 text-green-400 border-green-500/30`;
      } else if (isActive) {
        classes = `${baseClasses} bg-blue-500/20 text-blue-400 border-blue-500/30`;
      } else {
        classes = `${baseClasses} bg-slate-800 text-slate-500 border-slate-700`;
      }

      const iconOrNum = isDone
        ? '<i class="fa-solid fa-check"></i>'
        : `<span class="w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-500' : 'bg-slate-600'} text-white" style="font-size:10px">${i + 1}</span>`;

      const sep =
        i < steps.length - 1
          ? '<div class="w-6 h-px bg-slate-600 flex-shrink-0"></div>'
          : '';

      return `
        <div class="${classes}">${iconOrNum} ${escapeHtml(s.label)}</div>
        ${sep}`;
    })
    .join('');
}

// ── Operation progress bar ────────────────────────────────────────────────────

export function renderOperation(state, els) {
  const op = state.operation;
  const isIdle = op.total === 0 || op.label === 'Idle';

  if (els.progressBarWrap) {
    els.progressBarWrap.classList.toggle('hidden', isIdle);
  }

  if (!isIdle) {
    const pct = op.total > 0 ? Math.round((op.done / op.total) * 100) : 0;
    if (els.progressLabel) els.progressLabel.textContent = op.label;
    if (els.progressPct) els.progressPct.textContent = `${pct}%`;
    if (els.progressFill) els.progressFill.style.width = `${pct}%`;
  }
}

// ── Toast notifications ───────────────────────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {HTMLElement} container
 */
export function showToast(message, type, container) {
  if (!container) return;

  const colors = {
    success: 'bg-green-500/20 border-green-500/40 text-green-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  };
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
  };

  const colorClass = colors[type] || colors.info;
  const iconClass = icons[type] || icons.info;

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${colorClass} text-sm shadow-xl backdrop-blur-sm max-w-sm translate-x-0 opacity-100 transition-all duration-300`;
  toast.innerHTML = `
    <i class="fa-solid ${iconClass} flex-shrink-0"></i>
    <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Button states ─────────────────────────────────────────────────────────────

export function updateButtons(state, els) {
  const hasClient = !!( 
    state.clients.get(state.activePhone) ||
    (state.clients.size > 0 ? state.clients.values().next().value : null)
  );

  // Search button — needs client
  if (els.searchGroupsBtn) {
    els.searchGroupsBtn.disabled = !hasClient;
    els.searchGroupsBtn.title = hasClient ? '' : 'Login to Telegram first';
  }

  // Scan button — needs client + selected groups
  if (els.scanBtn) {
    const hasSelected = state.groups.some((g) => g.selected);
    els.scanBtn.disabled = !hasClient || !hasSelected;
    els.scanBtn.title = !hasClient
      ? 'Login to Telegram first'
      : !hasSelected
      ? 'Select at least one group'
      : '';
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _scoreColor(score) {
  if (score >= 90) return 'bg-green-500/20 text-green-400';
  if (score >= 70) return 'bg-blue-500/20 text-blue-400';
  return 'bg-yellow-500/20 text-yellow-400';
}

function _fmtNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
