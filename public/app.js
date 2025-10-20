async function fetchOptions() {
    const res = await fetch('/api/options');
    const data = await res.json();
    return data;
  }
  
  function fillSelect(sel, options) {
    sel.innerHTML = '<option value="">-- select --</option>';
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.name;
      sel.appendChild(opt);
    }
  }
  
  async function loadFormOptions() {
    const data = await fetchOptions();
    const form = document.getElementById('sampleForm');
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
  
  async function submitForm(e) {
    e.preventDefault();
    const f = e.target;
  
    const colorsRaw = (f.colors_raw.value || '').trim();
    const color_list = colorsRaw
      ? colorsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : null;
  
    const payload = {
      model_kodu: f.model_kodu.value.trim(),
      product_group_id: Number(f.product_group_id.value),
      line_id: Number(f.line_id.value),
      fabric_type_id: Number(f.fabric_type_id.value),
      fabric_supplier_id: Number(f.fabric_supplier_id.value),
      fit_type_id: Number(f.fit_type_id.value),
      collar_type_id: Number(f.collar_type_id.value),
      sample_status_id: Number(f.sample_status_id.value),
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
      dyeing_supplier: f.dyeing_supplier.value || null,
      color_list
    };
  
    const res = await fetch('/api/samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  
    const out = await res.json();
    const msg = document.getElementById('msg');
    if (res.ok) {
      msg.textContent = `Saved. New ID = ${out.id}`;
      f.reset();
      await loadSamples();
    } else {
      msg.textContent = `Error: ${out.error}`;
    }
  }
  
  async function loadSamples() {
    const res = await fetch('/api/samples');
    const rows = await res.json();
    const tbody = document.querySelector('#samplesTable tbody');
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
        <td>${new Date(r.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    }
  }
  
  const addForm = document.getElementById('addForm');
  if (addForm) {
    addForm.addEventListener('submit', submitForm);
  }
  
  loadFormOptions().then(loadSamples);
  