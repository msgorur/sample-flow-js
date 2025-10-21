let colorOptions = [];
let mode = "add";
let editId = null;

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function initForm() {
  const id = getParam("id");
  if (id) {
    mode = "edit";
    editId = id;
    document.getElementById("formTitle").textContent = "Numune Düzenle";
  }

  const data = await fetchOptions();
  const form = document.getElementById("sampleForm");

  fillSelect(form.product_group_id, data.product_groups);
  fillSelect(form.line_id, data.lines);
  fillSelect(form.fabric_type_id, data.fabric_types);
  fillSelect(form.fabric_supplier_id, data.fabric_suppliers);
  fillSelect(form.fit_type_id, data.fit_types);
  fillSelect(form.collar_type_id, data.collar_types);
  fillSelect(form.sample_status_id, data.sample_statuses);

  await loadColors();

  if (mode === "edit") {
    await loadExistingSample(editId);
  } else {
    addColorRow();
  }

  document.getElementById("addColorBtn").addEventListener("click", () => addColorRow());
  document.getElementById("sampleForm").addEventListener("submit", handleSubmit);
}

async function loadColors() {
  const res = await fetch("/api/colors");
  colorOptions = await res.json();
}

function addColorRow(selectedId = null) {
  const div = document.createElement("div");
  div.className = "color-row";

  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">-- renk seç --</option>` +
    colorOptions.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  if (selectedId) select.value = selectedId;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "✕";
  btn.onclick = () => div.remove();

  div.appendChild(select);
  div.appendChild(btn);
  document.getElementById("colorList").appendChild(div);
}

async function loadExistingSample(id) {
  const res = await fetch(`/api/samples/${id}`);
  const s = await res.json();
  const f = document.getElementById("sampleForm");

  f.model_kodu.value = s.model_kodu ?? "";
  f.product_group_id.value = s.product_group_id ?? "";
  f.line_id.value = s.line_id ?? "";
  f.fabric_type_id.value = s.fabric_type_id ?? "";
  f.fabric_supplier_id.value = s.fabric_supplier_id ?? "";
  f.fit_type_id.value = s.fit_type_id ?? "";
  f.collar_type_id.value = s.collar_type_id ?? "";
  f.sample_status_id.value = s.sample_status_id ?? "";

  document.getElementById("colorList").innerHTML = "";
  (s.color_list || []).forEach(cid => addColorRow(cid));
}

async function handleSubmit(e) {
  e.preventDefault();
  const f = e.target;

  const payload = {
    model_kodu: f.model_kodu.value.trim(),
    product_group_id: Number(f.product_group_id.value),
    line_id: Number(f.line_id.value),
    fabric_type_id: Number(f.fabric_type_id.value),
    fabric_supplier_id: Number(f.fabric_supplier_id.value),
    fit_type_id: Number(f.fit_type_id.value),
    collar_type_id: Number(f.collar_type_id.value),
    sample_status_id: Number(f.sample_status_id.value),
    color_list: Array.from(document.querySelectorAll("#colorList select"))
      .map(s => parseInt(s.value))
      .filter(Boolean)
  };

  const method = mode === "add" ? "POST" : "PUT";
  const url = mode === "add" ? "/api/samples" : `/api/samples/${editId}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const msg = document.getElementById("msg");
  if (res.ok) {
    msg.textContent = "✅ Kaydedildi.";
    msg.style.color = "green";
    setTimeout(() => (window.location.href = "/"), 1200);
  } else {
    const err = await res.json().catch(() => ({}));
    msg.textContent = "❌ Hata: " + (err.error || "İşlem başarısız");
    msg.style.color = "red";
  }
}

document.addEventListener("DOMContentLoaded", initForm);