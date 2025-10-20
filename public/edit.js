// ==========================
// edit.js (final safe version)
// ==========================

function getSampleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }
  
  let colorOptions = [];
  
  // Renkleri çek
  async function loadColors() {
    try {
      const res = await fetch("/api/colors");
      if (!res.ok) throw new Error(`colors fetch failed (${res.status})`);
      colorOptions = await res.json();
    } catch (err) {
      console.error("Failed to load colors:", err);
      colorOptions = [];
    }
  }
  
  // Renk satırı ekle (kopya engelli)
  function addColorRow(selectedId = null) {
    const currentIds = Array.from(document.querySelectorAll("#colorList select"))
      .map(sel => parseInt(sel.value, 10))
      .filter(v => !Number.isNaN(v));
  
    if (!selectedId && currentIds.length >= colorOptions.length) {
      alert("Tüm renkler zaten eklendi.");
      return;
    }
  
    const available = colorOptions.filter(
      c => !currentIds.includes(c.id) || c.id === Number(selectedId)
    );
  
    const div = document.createElement("div");
    div.className = "color-row";
  
    const select = document.createElement("select");
    select.innerHTML =
      `<option value="">-- renk seç --</option>` +
      available.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  
    if (selectedId && available.some(c => c.id === Number(selectedId))) {
      select.value = String(selectedId);
    }
  
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => div.remove();
  
    div.appendChild(select);
    div.appendChild(removeBtn);
    document.getElementById("colorList").appendChild(div);
  }
  
  // Ürünü getir
  async function loadSampleData() {
    const id = getSampleId();
    const form = document.getElementById("editForm");
    if (!form) return;
  
    const res = await fetch(`/api/samples/${id}`);
    const sample = await res.json();
  
    const data = await fetchOptions();
    fillSelect(form.product_group_id, data.product_groups);
    fillSelect(form.line_id, data.lines);
    fillSelect(form.fabric_type_id, data.fabric_types);
    fillSelect(form.fabric_supplier_id, data.fabric_suppliers);
    fillSelect(form.fit_type_id, data.fit_types);
    fillSelect(form.sample_status_id, data.sample_statuses);
    fillSelect(form.collar_type_id, data.collar_types);
  
    form.model_kodu.value = sample.model_kodu ?? "";
    form.product_group_id.value = sample.product_group_id ?? "";
    form.line_id.value = sample.line_id ?? "";
    form.fabric_type_id.value = sample.fabric_type_id ?? "";
    form.fabric_supplier_id.value = sample.fabric_supplier_id ?? "";
    form.fit_type_id.value = sample.fit_type_id ?? "";
    form.collar_type_id.value = sample.collar_type_id ?? "";
    form.sample_status_id.value = sample.sample_status_id ?? "";
  
    await loadColors();
    document.getElementById("colorList").innerHTML = "";
  
    const colorIds = Array.isArray(sample.color_list) ? sample.color_list : [];
    if (colorIds.length > 0) colorIds.forEach(cid => addColorRow(cid));
    else addColorRow();
  }
  
  // Form submit
  async function submitEditForm(e) {
    e.preventDefault();
    const id = getSampleId();
    const f = e.target;
  
    const modelCode = f.model_kodu.value.trim();
    if (!modelCode) {
      alert("Model kodu zorunludur.");
      return;
    }
  
    // Unique kontrolü — aynı kod başka üründe varsa izin verme
    const checkRes = await fetch(`/api/samples/check-model/${modelCode}?exclude=${id}`);
    const check = await checkRes.json();
    if (check.exists) {
      alert("Bu model kodu başka bir üründe mevcut. Lütfen farklı bir kod kullanın.");
      return;
    }
  
    const colorIds = Array.from(document.querySelectorAll("#colorList select"))
      .map(sel => parseInt(sel.value, 10))
      .filter(v => !Number.isNaN(v));
  
    const payload = {
      model_kodu: modelCode,
      product_group_id: Number(f.product_group_id.value) || null,
      line_id: Number(f.line_id.value) || null,
      fabric_type_id: Number(f.fabric_type_id.value) || null,
      fabric_supplier_id: Number(f.fabric_supplier_id.value) || null,
      fit_type_id: Number(f.fit_type_id.value) || null,
      collar_type_id: Number(f.collar_type_id.value) || null,
      sample_status_id: Number(f.sample_status_id.value) || null,
      color_ids: colorIds.length > 0 ? colorIds : null,
    };
  
    const res = await fetch(`/api/samples/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  
    const msg = document.getElementById("msg");
    if (res.ok) {
      msg.textContent = "✅ Changes saved successfully.";
      msg.style.color = "green";
      setTimeout(() => (window.location.href = "/"), 1200);
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = "❌ Error: " + (err.error || "Update failed");
      msg.style.color = "red";
    }
  }
  
  // Başlat
  document.addEventListener("DOMContentLoaded", async () => {
    await loadColors();
    await loadSampleData();
    const form = document.getElementById("editForm");
    if (form) form.addEventListener("submit", submitEditForm);
  });
  