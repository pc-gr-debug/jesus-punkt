(function () {
  const STORAGE_KEY = 'wedding_rsvp_submitted';
  const MAX_FAMILY_MEMBERS = 10;

  const form = document.getElementById('rsvp-form');
  const thanks = document.getElementById('thanks');
  const familyMembersEl = document.getElementById('family-members');
  const addButton = document.getElementById('add-family-member');
  const errorEl = document.getElementById('form-error');
  const successModal = document.getElementById('success-modal');
  const modalCloseButton = document.getElementById('modal-close');

  function showThanks() {
    form.hidden = true;
    thanks.hidden = false;
  }

  function closeModal() {
    successModal.hidden = true;
  }

  modalCloseButton.addEventListener('click', closeModal);
  successModal.addEventListener('click', function (event) {
    if (event.target === successModal) closeModal();
  });

  if (localStorage.getItem(STORAGE_KEY)) {
    showThanks();
    return;
  }

  function updateRemoveButtons() {
    const fields = Array.from(familyMembersEl.children);
    fields.forEach(function (field, index) {
      const btn = field.querySelector('.field__remove');
      if (btn) btn.hidden = index !== fields.length - 1;
    });
  }

  function addFamilyMemberField() {
    if (familyMembersEl.children.length >= MAX_FAMILY_MEMBERS) return;

    const label = document.createElement('label');
    label.className = 'field';
    label.innerHTML = '<span>Familienmitglied</span>';

    const row = document.createElement('div');
    row.className = 'field__row';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'familyMember';
    input.maxLength = 100;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'field__remove';
    removeButton.setAttribute('aria-label', 'Familienmitglied entfernen');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', function () {
      label.remove();
      updateRemoveButtons();
    });

    row.appendChild(input);
    row.appendChild(removeButton);
    label.appendChild(row);
    familyMembersEl.appendChild(label);
    updateRemoveButtons();
    input.focus();
  }

  addButton.addEventListener('click', addFamilyMemberField);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorEl.hidden = true;

    const name = form.elements.name.value.trim();
    const familyMembers = Array.from(
      familyMembersEl.querySelectorAll('input[name="familyMember"]')
    )
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);

    if (!name) {
      errorEl.textContent = 'Bitte gib deinen Namen ein.';
      errorEl.hidden = false;
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/wedding-rsvp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, familyMembers }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        errorEl.textContent = data.error || 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';
        errorEl.hidden = false;
        submitButton.disabled = false;
        return;
      }

      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      showThanks();
      successModal.hidden = false;
    } catch (err) {
      errorEl.textContent = 'Verbindung fehlgeschlagen. Bitte versuch es erneut.';
      errorEl.hidden = false;
      submitButton.disabled = false;
    }
  });
})();
