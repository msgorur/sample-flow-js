(function () {
  async function fetchOptions() {
    const res = await fetch('/api/options');
    if (!res.ok) {
      throw new Error(`Failed to load options (status ${res.status})`);
    }
    return res.json();
  }

  function fillSelect(selectElement, options) {
    if (!selectElement) {
      return;
    }

    const items = Array.isArray(options) ? options : [];
    selectElement.innerHTML = '<option value="">-- seçiniz --</option>';

    for (const option of items) {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.name;
      selectElement.appendChild(opt);
    }
  }

  window.fetchOptions = fetchOptions;
  window.fillSelect = fillSelect;
})();
