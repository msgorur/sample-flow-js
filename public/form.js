// form.js — Dynamic Add/Edit Sample Form

let colorOptions = [];
let formFields = [];
let isEditMode = false;
let sampleId = null;

// 1️⃣ Check mode (Add or Edit)
function getSampleId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// 2️⃣ Load dynamic form structure
async function loadFormStructure() {
  try {
    const res = await fetch('/api/ui/form/samples');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    formFields = await res.json();
    if (!Array.isArray(formFields)) formFields = [];
    renderFormFields();
  } catch (err) {
    console.error('Form structure load error:', err);
    const form = document.getElementById('sampleForm');
    form.innerHTML = '<p style="color:red;">Form alanları yüklenemedi.</p>';
  }
}

// 3️⃣ Render fields dynamically
function renderFormFields() {
  const form = document.getElementById('sampleForm');
  form.innerHTML = ''; // clear before re-render

  formFields.forEach(field => {
    if (!field.is_visible_form) return; // skip hidden fields
    if (!field.display_name || !field.column_name) return; // skip malformed fields

    const label = document.createElement('label');
    label.textContent = field.display_name;
    if (field.is_required) {
      const reqMark = document.createElement('span');
      reqMark.textContent = ' *';
      reqMark.style.color = 'red';
      label.appendChild(reqMark);
    }

    let input;
    if (field.column_name.includes('_id')) {
      input = document.createElement('select');
    } else {
      input = document.createElement('input');
      input.type = 'text';
    }

    input.name = field.column_name;
    if (field.is_required) {
      input.required = true;
      input.classList.add('required-field');
    }

    if (input.tagName === 'INPUT') {
      input.placeholder = `${field.display_name} giriniz`;
    }

    label.appendChild(input);
    form.appendChild(label);
  });

  // color section
  const colorSection = document.createElement('div');
  colorSection.id = 'colorSection';
  colorSection.innerHTML = `
    <label>Renkler</label>
    <div id="colorList"></div>
    <button type="button" class="add-color-btn" onclick="addColorRow()">+ Renk Ekle</button>
  `;
  form.appendChild(colorSection);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.innerHTML = `
    <button type="submit">💾 Kaydet</button>
    <button type="button" onclick="window.location.href='/'">⬅ Geri</button>
  `;
  form.appendChild(buttons);
}

// 4️⃣ Load dropdown options
async function fetchOptions() {
  const res = await fetch('/api/options');
  const options = await res.json();
  if (!options || typeof options !== 'object') return {};
  return options;
}

function fillSelect(select, options) {
  if (!options || !Array.isArray(options)) return;
  select.innerHTML = '<option value="">-- Seçiniz --</option>';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.id;
    o.textContent = opt.name;
    select.appendChild(o);
  });
}

// 5️⃣ Load colors
async function loadColors() {
  const res = await fetch('/api/colors');
  colorOptions = await res.json();
}

function addColorRow(selectedId = null) {
  const list = document.getElementById('colorList');
  const div = document.createElement('div');
  div.className = 'color-row';

  const select = document.createElement('select');
  select.innerHTML = '<option value="">-- renk seç --</option>' +
    colorOptions.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (selectedId) select.value = String(selectedId);

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✕';
  removeBtn.type = 'button';
  removeBtn.onclick = () => div.remove();

  div.appendChild(select);
  div.appendChild(removeBtn);
  list.appendChild(div);
}

// 6️⃣ Load sample data if editing
async function loadSampleData() {
  const id = getSampleId();
  if (!id) return;

  const res = await fetch(`/api/samples/${id}`);
  const sample = await res.json();
  isEditMode = true;
  sampleId = id;

  formFields.forEach(field => {
    const input = document.querySelector(`[name="${field.column_name}"]`);
    if (input && sample[field.column_name] != null) {
      input.value = sample[field.column_name];
    }
  });

  if (Array.isArray(sample.color_list)) {
    sample.color_list.forEach(cid => addColorRow(cid));
  } else {
    addColorRow();
  }
}

// 7️⃣ Submit handler
async function submitForm(e) {
  e.preventDefault();
  const form = e.target;

  const colorIds = Array.from(document.querySelectorAll('#colorList select'))
    .map(sel => parseInt(sel.value, 10))
    .filter(v => !Number.isNaN(v));

  const payload = {};
  formFields.forEach(field => {
    const el = form.querySelector(`[name="${field.column_name}"]`);
    payload[field.column_name] = el ? el.value || null : null;
  });

  payload.color_list = colorIds;

  const method = isEditMode ? 'PUT' : 'POST';
  const url = isEditMode ? `/api/samples/${sampleId}` : '/api/samples';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const msg = document.getElementById('msg');
  if (res.ok) {
    msg.textContent = '✅ Başarıyla kaydedildi';
    msg.style.color = 'green';
    setTimeout(() => (window.location.href = '/'), 1000);
  } else {
    const err = await res.json().catch(() => ({}));
    msg.textContent = '❌ Hata: ' + (err.error || 'Kaydedilemedi');
    msg.style.color = 'red';
  }
}

console.log("Form initialized, edit mode:", isEditMode);

// 8️⃣ Initialize

document.addEventListener('DOMContentLoaded', async () => {
  await loadColors();
  await loadFormStructure();

  const options = await fetchOptions();
  Object.keys(options).forEach(key => {
    const select = document.querySelector(`[name="${key.slice(0, -1)}_id"]`);
    if (select) fillSelect(select, options[key]);
  });

  await loadSampleData();

  const form = document.getElementById('sampleForm');
  form.addEventListener('submit', submitForm);
});