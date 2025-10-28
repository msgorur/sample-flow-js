let colorOptions = [];
let mode = 'add';
let editId = null;

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function toIntegerOrNull(value) {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

function getSelectedColorIds() {
  return Array.from(document.querySelectorAll('#colorList select'))
    .map((select) => Number.parseInt(select.value, 10))
    .filter((value) => Number.isInteger(value));
}

function showMessage(text, type = 'info') {
  const msg = document.getElementById('msg');
  if (!msg) return;

  msg.textContent = text;
  msg.style.color = type === 'error' ? 'red' : 'green';
}

async function initForm() {
  const id = getParam('id');
  if (id) {
    mode = 'edit';
    editId = id;
    const title = document.getElementById('formTitle');
    if (title) {
      title.textContent = 'Numune Düzenle';
    }
  }

  const form = document.getElementById('sampleForm');
  if (!form) return;

  const data = await fetchOptions();
  fillSelect(form.product_group_id, data.product_groups);
  fillSelect(form.line_id, data.lines);
  fillSelect(form.fabric_type_id, data.fabric_types);
  fillSelect(form.fabric_supplier_id, data.fabric_suppliers);
  fillSelect(form.fit_type_id, data.fit_types);
  fillSelect(form.collar_type_id, data.collar_types);
  fillSelect(form.sample_status_id, data.sample_statuses);

  await loadColors();

  if (mode === 'edit') {
    await loadExistingSample(editId);
  } else {
    addColorRow();
  }

  const addColorBtn = document.getElementById('addColorBtn');
  if (addColorBtn) {
    addColorBtn.addEventListener('click', () => addColorRow());
  }

  form.addEventListener('submit', handleSubmit);
}

async function loadColors() {
  try {
    const res = await fetch('/api/colors');
    if (!res.ok) {
      throw new Error(`colors fetch failed (${res.status})`);
    }
    colorOptions = await res.json();
  } catch (err) {
    console.error('Failed to load colors:', err);
    colorOptions = [];
  }
}

function addColorRow(selectedId = null) {
  if (!Array.isArray(colorOptions) || colorOptions.length === 0) {
    console.warn('Color options not loaded yet');
    return;
  }

  const currentIds = getSelectedColorIds();
  if (!selectedId && currentIds.length >= colorOptions.length) {
    alert('Tüm renkler zaten eklendi.');
    return;
  }

  const available = colorOptions.filter(
    (color) => !currentIds.includes(color.id) || color.id === Number(selectedId)
  );

  const wrapper = document.createElement('div');
  wrapper.className = 'color-row';

  const select = document.createElement('select');
  select.innerHTML =
    '<option value="">-- renk seç --</option>' +
    available.map((color) => `<option value="${color.id}">${color.name}</option>`).join('');

  if (selectedId && available.some((color) => color.id === Number(selectedId))) {
    select.value = String(selectedId);
  }

  // Add change event to prevent duplicate selections
  select.addEventListener('change', () => {
    const selectedValue = select.value;
    if (selectedValue) {
      // Update other selects to remove this option
      updateColorOptions();
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    wrapper.remove();
    updateColorOptions();
  });

  wrapper.appendChild(select);
  wrapper.appendChild(removeBtn);
  document.getElementById('colorList').appendChild(wrapper);
}

function updateColorOptions() {
  const selects = document.querySelectorAll('#colorList select');
  const selectedIds = Array.from(selects)
    .map(select => select.value)
    .filter(value => value);

  selects.forEach(select => {
    const currentValue = select.value;
    const options = Array.from(select.options);
    
    options.forEach(option => {
      if (option.value && option.value !== currentValue) {
        option.disabled = selectedIds.includes(option.value);
        option.style.display = selectedIds.includes(option.value) ? 'none' : '';
      }
    });
  });
}

async function loadExistingSample(id) {
  const res = await fetch(`/api/samples/${id}`);
  if (!res.ok) {
    showMessage('Numune yüklenemedi.', 'error');
    return;
  }

  const sample = await res.json();
  const form = document.getElementById('sampleForm');

  form.model_kodu.value = sample.model_kodu ?? '';
  form.product_group_id.value = sample.product_group_id ?? '';
  form.line_id.value = sample.line_id ?? '';
  form.fabric_type_id.value = sample.fabric_type_id ?? '';
  form.fabric_supplier_id.value = sample.fabric_supplier_id ?? '';
  form.fit_type_id.value = sample.fit_type_id ?? '';
  form.collar_type_id.value = sample.collar_type_id ?? '';
  form.sample_status_id.value = sample.sample_status_id ?? '';

  const colorList = document.getElementById('colorList');
  colorList.innerHTML = '';

  const colorIds = Array.isArray(sample.color_list) ? sample.color_list : [];
  if (colorIds.length > 0) {
    colorIds.forEach((colorId) => addColorRow(colorId));
  } else {
    addColorRow();
  }
}

async function ensureUniqueModel(modelCode) {
  const base = `/api/samples/check-model/${encodeURIComponent(modelCode)}`;
  const url = mode === 'edit' && editId ? `${base}?exclude=${editId}` : base;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`model check failed (${res.status})`);
  }
  const data = await res.json();
  return !data.exists;
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;

  // Basic validation
  const modelCode = form.model_kodu.value.trim();
  if (!modelCode) {
    showMessage('Model kodu zorunludur.', 'error');
    form.model_kodu.focus();
    return;
  }

  // Check required fields
  const requiredFields = [
    { field: 'product_group_id', name: 'Ürün Grubu' },
    { field: 'line_id', name: 'Line' },
    { field: 'fabric_type_id', name: 'Kumaş Tipi' },
    { field: 'fabric_supplier_id', name: 'Kumaş Tedarikçisi' },
    { field: 'fit_type_id', name: 'Fit Tipi' },
    { field: 'sample_status_id', name: 'Durum' }
  ];

  for (const { field, name } of requiredFields) {
    if (!form[field].value) {
      showMessage(`${name} seçimi zorunludur.`, 'error');
      form[field].focus();
      return;
    }
  }

  // Check if at least one color is selected
  const colorIds = getSelectedColorIds();
  if (colorIds.length === 0) {
    showMessage('En az bir renk seçmelisiniz.', 'error');
    return;
  }

  try {
    const unique = await ensureUniqueModel(modelCode);
    if (!unique) {
      showMessage('Bu model kodu başka bir kayıtta mevcut.', 'error');
      return;
    }
  } catch (err) {
    console.error('Model check failed:', err);
    showMessage('Model kodu kontrolü yapılamadı.', 'error');
    return;
  }

  const colorIds = getSelectedColorIds();

  const payload = {
    model_kodu: modelCode,
    product_group_id: toIntegerOrNull(form.product_group_id.value),
    line_id: toIntegerOrNull(form.line_id.value),
    fabric_type_id: toIntegerOrNull(form.fabric_type_id.value),
    fabric_supplier_id: toIntegerOrNull(form.fabric_supplier_id.value),
    fit_type_id: toIntegerOrNull(form.fit_type_id.value),
    collar_type_id: toIntegerOrNull(form.collar_type_id.value),
    sample_status_id: toIntegerOrNull(form.sample_status_id.value),
    color_list: colorIds.length > 0 ? colorIds : null,
  };

  const method = mode === 'add' ? 'POST' : 'PUT';
  const url = mode === 'add' ? '/api/samples' : `/api/samples/${editId}`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showMessage('✅ Kaydedildi.', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    } else {
      const err = await res.json().catch(() => ({}));
      showMessage(`❌ Hata: ${err.error || 'İşlem başarısız'}`, 'error');
    }
  } catch (err) {
    console.error('Save failed:', err);
    showMessage('❌ Ağ hatası veya sunucu erişilemedi.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', initForm);
