// ==========================
// add.js (final safe version)
// ==========================

let colorOptions = [];

/** Backend'den renkleri çek (güvenli) */
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

/** Yeni renk satırı oluştur (kopya engelli) */
function addColorRow(selectedId = null) {
  if (!Array.isArray(colorOptions) || colorOptions.length === 0) {
    console.warn("Color options not loaded yet");
    return;
  }

  const currentIds = Array.from(document.querySelectorAll("#colorList select"))
    .map(sel => parseInt(sel.value, 10))
    .filter(v => !Number.isNaN(v));

  // Tüm renkler seçildiyse yeni dropdown'ı engelle
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

/** Dropdown'ları yükle (app.js -> fetchOptions/fillSelect gerekir) */
async function loadFormOptions() {
  const form = document.getElementById("addForm");
  if (!form) return;

  const data = await fetchOptions(); // app.js'te tanımlı olmalı
  fillSelect(form.product_group_id, data.product_groups);
  fillSelect(form.line_id, data.lines);
  fillSelect(form.fabric_type_id, data.fabric_types);
  fillSelect(form.fabric_supplier_id, data.fabric_suppliers);
  fillSelect(form.fit_type_id, data.fit_types);
  fillSelect(form.sample_status_id, data.sample_statuses);
  fillSelect(form.collar_type_id, data.collar_types); // zorunlu değil ama listeliyoruz
}

/** Form submit */
async function submitAddForm(e) {
  e.preventDefault();
  const f = e.target;

  // Unique model kodu kontrolü (önceden var mı?)
  const modelCode = f.model_kodu.value.trim();
  if (!modelCode) {
    alert("Model kodu zorunludur.");
    return;
  }

  const checkRes = await fetch(`/api/samples/check-model/${encodeURIComponent(modelCode)}`);
  const check = await checkRes.json().catch(() => ({ exists: false }));
  if (check && check.exists) {
    alert("Bu model kodu zaten mevcut. Lütfen farklı bir kod girin.");
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
    collar_type_id: Number(f.collar_type_id.value) || null, // artık zorunlu değil
    sample_status_id: Number(f.sample_status_id.value) || null,

    // 🔴 ÖNEMLİ: Backend'in POST'ta beklediği alan genelde 'color_list'
    // Eğer server POST /api/samples color_ids bekliyorsa aşağıyı color_ids yap.
    color_list: colorIds.length > 0 ? colorIds : null
  };

  try {
    const res = await fetch("/api/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const msg = document.getElementById("msg");
    if (res.ok) {
      msg.textContent = "✅ Product added successfully.";
      msg.style.color = "green";
      setTimeout(() => (window.location.href = "/"), 1000);
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = "❌ Error: " + (err.error || "Insert failed");
      msg.style.color = "red";
    }
  } catch (error) {
    console.error("Insert failed:", error);
    const msg = document.getElementById("msg");
    if (msg) {
      msg.textContent = "❌ Network or server error.";
      msg.style.color = "red";
    }
  }
}

/** Başlatma */
document.addEventListener("DOMContentLoaded", async () => {
  // SIRA ÖNEMLİ: önce options, sonra colors, sonra ilk satır
  await loadFormOptions();
  await loadColors();

  // + Add Color butonu dinle
  const addBtn = document.getElementById("addColorBtn");
  if (addBtn) addBtn.addEventListener("click", () => addColorRow());

  // en az bir renk satırı göster
  addColorRow();

  // submit
  const form = document.getElementById("addForm");
  if (form) form.addEventListener("submit", submitAddForm);
});
