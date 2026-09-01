(function () {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const guestList = document.getElementById('guest-list');
  const totalCountEl = document.getElementById('total-count');
  const guestRowsEl = document.getElementById('guest-rows');
  const exportButton = document.getElementById('export-pdf');

  function addRow(nameText, dateText, isFamilyMember) {
    const row = document.createElement('tr');
    if (isFamilyMember) row.className = 'row--family';

    const nameCell = document.createElement('td');
    nameCell.textContent = isFamilyMember ? '↳ ' + nameText : nameText;

    const dateCell = document.createElement('td');
    dateCell.textContent = dateText;

    row.appendChild(nameCell);
    row.appendChild(dateCell);
    guestRowsEl.appendChild(row);
  }

  function renderGuests(data) {
    totalCountEl.textContent = String(data.total);
    guestRowsEl.innerHTML = '';
    data.guests.forEach((guest) => {
      const dateText = new Date(guest.createdAt).toLocaleString('de-DE');
      addRow(guest.name, dateText, false);
      guest.familyMembers.forEach((member) => addRow(member, dateText, true));
    });

    loginForm.hidden = true;
    guestList.hidden = false;
  }

  async function loadGuests() {
    const response = await fetch('/api/wedding-guests/');
    if (!response.ok) return false;
    const data = await response.json();
    renderGuests(data);
    return true;
  }

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    loginError.hidden = true;

    const password = loginForm.elements.password.value;
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/wedding-admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        loginError.textContent = data.error || 'Anmeldung fehlgeschlagen.';
        loginError.hidden = false;
        submitButton.disabled = false;
        return;
      }

      await loadGuests();
    } catch (err) {
      loginError.textContent = 'Verbindung fehlgeschlagen. Bitte versuch es erneut.';
      loginError.hidden = false;
      submitButton.disabled = false;
    }
  });

  exportButton.addEventListener('click', function () {
    window.print();
  });

  loadGuests();
})();
