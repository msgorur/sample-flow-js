async function fetchOptions() {
  const res = await fetch("/api/options");
  return await res.json();
}

function fillSelect(sel, options) {
  sel.innerHTML = '<option value="">-- seçiniz --</option>';
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.name;
    sel.appendChild(opt);
  }
}

async function loadFormOptions(form) {
  if (!form) return;
  const data = await fetchOptions();
  fillSelect(form.product_group_id, data.product_groups);
  fillSelect(form.line_id, data.lines);
  fillSelect(form.fabric_type_id, data.fabric_types);
  fillSelect(form.fabric_supplier_id, data.fabric_suppliers);
  fillSelect(form.fit_type_id, data.fit_types);
  fillSelect(form.collar_type_id, data.collar_types);
  fillSelect(form.sample_status_id, data.sample_statuses);
  fillSelect(form.design_responsible_id, data.design_responsibles);
  fillSelect(form.production_responsible_id, data.production_responsibles);
}

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadSampleData(id, form) {
  if (!id || !form) return;
  const res = await fetch(`/api/samples/${id}`);
  if (!res.ok) return;
  const data = await res.json();

  form.model_kodu.value = data.model_kodu || '';
  form.product_group_id.value = data.product_group_id || '';
  form.line_id.value = data.line_id || '';
  form.fabric_type_id.value = data.fabric_type_id || '';
  form.fabric_supplier_id.value = data.fabric_supplier_id || '';
  form.fit_type_id.value = data.fit_type_id || '';
  form.collar_type_id.value = data.collar_type_id || '';
  form.sample_status_id.value = data.sample_status_id || '';
  form.design_responsible_id.value = data.design_responsible_id || '';
  form.production_responsible_id.value = data.production_responsible_id || '';

  form.fabric_content.value = data.fabric_content || '';
  form.fabric_name.value = data.fabric_name || '';
  form.fabric_width.value = data.fabric_width != null ? data.fabric_width : '';
  form.fabric_weight.value = data.fabric_weight != null ? data.fabric_weight : '';
  form.product_description.value = data.product_description || '';
  form.fabric_unit_price.value = data.fabric_unit_price != null ? data.fabric_unit_price : '';
  form.print_supplier.value = data.print_supplier || '';
  form.embroidery_supplier.value = data.embroidery_supplier || '';
  form.dyeing_supplier.value = data.dyeing_supplier || '';

  // Edit formunda mevcut renk ID'lerini virgülle gösteriyoruz
  // (ör: "1, 2, 5")
  const ids = Array.isArray(data.color_list) ? data.color_list : [];
  form.colors_raw.value = ids.join(', ');
}

async function submitForm(e) {
  e.preventDefault();
  const f = e.target;

  // "1, 2, 5" → [1,2,5]
  const colorsRaw = (f.colors_raw.value || '').trim();
  const colorIdsNum =
    colorsRaw
      ? colorsRaw
          .split(',')
          .map(s => Number(s.trim()))
          .filter(n => Number.isInteger(n) && n > 0)
      : null;

  const payloadBase = {
    model_kodu: f.model_kodu.value.trim(),
    product_group_id: Number(f.product_group_id.value) || null,
    line_id: Number(f.line_id.value) || null,
    fabric_type_id: Number(f.fabric_type_id.value) || null,
    fabric_supplier_id: Number(f.fabric_supplier_id.value) || null,
    fit_type_id: Number(f.fit_type_id.value) || null,
    collar_type_id: Number(f.collar_type_id.value) || null,
    sample_status_id: Number(f.sample_status_id.value) || null,
    design_responsible_id: f.design_responsible_id.value ? Number(f.design_responsible_id.value) : null,
    production_responsible_id: f.production_responsible_id.value ? Number(f.production_responsible_id.value) : null,

    fabric_content: f.fabric_content.value || null,
    fabric_name: f.fabric_name.value || null,
    fabric_width: f.fabric_width.value ? Number(f.fabric_width.value) : null,
    fabric_weight: f.fabric_weight.value ? Number(f.fabric_weight.value) : null,
    product_description: f.product_description.value || null,
    fabric_unit_price: f.fabric_unit_price.value ? Number(f.fabric_unit_price.value) : null,
    print_supplier: f.print_supplier.value || null,
    embroidery_supplier: f.embroidery_supplier.value || null,
    dyeing_supplier: f.dyeing_supplier.value || null
  };

  // 🔴 STANDARTLAŞTIRMA:
  // Artık hem POST hem PUT için TEK tip alan gönderiyoruz: color_ids (INT[])
  const payload = { ...payloadBase, color_ids: colorIdsNum };

  const id = f.dataset.id;
  let url = '/api/samples';
  let method = 'POST';
  if (id) {
    url = `/api/samples/${id}`;
    method = 'PUT';
  }

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const out = await res.json().catch(() => ({}));
  const msg = document.getElementById('msg');

  if (res.ok) {
    msg.textContent = method === 'POST'
      ? `Saved. New ID = ${out.id ?? ''}`.trim()
      : 'Saved.';
    msg.style.color = 'green';

    // Formu sıfırla (edit’te de temiz tutmak için)
    f.reset();
    f.dataset.id = '';

    // Liste varsa yenile
    if (typeof loadSamples === 'function') {
      await loadSamples();
    }
  } else {
    msg.textContent = `Error: ${out.error || 'Unknown error'}`;
    msg.style.color = 'red';
  }
}

async function loadSamples() {
  const res = await fetch('/api/samples');
  const rows = await res.json();
  const tbody = document.querySelector('#samplesTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.model_kodu ?? ''}</td>
      <td>${r.product_group ?? ''}</td>
      <td>${r.line ?? ''}</td>
      <td>${r.fabric_type ?? ''}</td>
      <td>${r.fabric_supplier ?? ''}</td>
      <td>${r.fit_type ?? ''}</td>
      <td>${r.collar_type ?? ''}</td>
      <td>${r.sample_status ?? ''}</td>
      <td>${r.colors ?? ''}</td>
      <td>${new Date(r.created_at ?? r.updated_at ?? Date.now()).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('addForm') || document.getElementById('sampleForm') || document.getElementById('editForm');
  if (!form) return;

  await loadFormOptions(form);

  const id = getIdFromUrl();
  if (id) {
    await loadSampleData(id, form);
    form.dataset.id = id;
  }

  form.addEventListener('submit', submitForm);

  await loadSamples();
});