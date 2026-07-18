/* Jesus Punkt — Formulare (Kontakt, Spendenbescheinigung) · no dependencies
   Every form.contact-form submits via AJAX to Web3Forms (api.web3forms.com),
   which mails the payload to info@jesus-punkt.de — the access_key rides as a
   hidden input in the markup, no server of our own involved. Field metadata
   still lives in data-brz-label/-type attributes (Brizy heritage): the label
   becomes the field name in the notification mail; the Email-typed field is
   sent as "email" so Web3Forms uses it as Reply-To. Cross-origin POST with
   Accept: application/json — the response is readable, so a failed send shows
   the error state instead of a false success. */
(function () {
  'use strict';

  /* DECISION 2026-07-18: Web3Forms replaces the own /api/contact SMTP
     function (retired — no SMTP_PASS env needed anymore). */
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- success modal (one per page) ---------- */
  var overlay = document.getElementById('fm-success');
  function showSuccess() {
    if (!overlay) return;
    overlay.classList.add('is-open');
    requestAnimationFrame(function () { overlay.classList.add('is-visible'); });
  }
  function hideSuccess() {
    overlay.classList.remove('is-visible');
    setTimeout(function () { overlay.classList.remove('is-open'); }, 250);
  }
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-fm-close]')) hideSuccess();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) hideSuccess();
    });
  }

  function setError(input, on) {
    var group = input.closest('.form-group');
    if (group) group.classList.toggle('has-error', on);
  }

  document.querySelectorAll('form.contact-form').forEach(function (form) {

    function validate() {
      var ok = true;
      form.querySelectorAll('input[required], textarea[required]').forEach(function (input) {
        var bad = !input.value.trim() ||
                  (input.type === 'email' && !EMAIL_RE.test(input.value.trim()));
        setError(input, bad);
        if (bad) ok = false;
      });
      return ok;
    }

    form.querySelectorAll('input[required], textarea[required]').forEach(function (input) {
      input.addEventListener('input', function () { setError(input, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.remove('has-failed');

      /* honeypot: bots fill it — pretend success, send nothing */
      var hp = form.querySelector('.form-group--hp input');
      if (hp && hp.value) { showSuccess(); form.reset(); return; }

      if (!validate()) return;

      /* named hidden inputs (access_key, subject, botcheck) come in via the
         form itself; the visible fields are appended under their label */
      var body = new FormData(form);
      form.querySelectorAll('[data-brz-name]').forEach(function (el) {
        var isEmail = el.getAttribute('data-brz-type') === 'Email';
        body.append(isEmail ? 'email' : el.getAttribute('data-brz-label'), el.value);
      });

      form.classList.add('is-sending');
      fetch(ENDPOINT, {
        method: 'POST',
        body: body,
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data || !data.success) throw new Error('send failed');
          form.classList.remove('is-sending');
          form.reset();
          showSuccess();
        })
        .catch(function () {
          form.classList.remove('is-sending');
          form.classList.add('has-failed');
        });
    });
  });
})();
