const tables = {
  "Ürün Grupları": "product_groups",
  "Line": "lines",
  "Kumaş Tipleri": "fabric_types",
  "Kumaş Tedarikçileri": "fabric_suppliers",
  "Fit Tipleri": "fit_types",
  "Yaka Tipleri": "collar_types",
  "Numune Durumları": "sample_statuses"
};

let currentTable = "product_groups";

// Sekme geçişleri
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTable = tables[tab.textContent.trim()];
      await loadTable(currentTable);
    });
  });

  loadTable(currentTable);
});

// Veri yükleme
async function loadTable(tableName) {
  const res = await fetch(`/api/params/${tableName}`);
  const data = await res.json();
  renderTable(data, tableName);
}

// Tabloyu oluştur
function renderTable(data, tableName) {
  const container = document.getElementById("paramTable");
  container.innerHTML = `
    <table id="sortableTable">
      <thead>
        <tr>
          <th style="width:5%">☰</th>
          <th>Ad</th>
          <th>Aktif</th>
          <th style="width:15%">İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr data-id="${row.id}">
            <td style="cursor:grab;">☰</td>
            <td><input type="text" value="${row.name}" onchange="updateName('${tableName}', ${row.id}, this.value)" /></td>
            <td><input type="checkbox" ${row.is_active ? "checked" : ""} onchange="toggleActive('${tableName}', ${row.id}, this.checked)" /></td>
            <td><button class="btn-delete" onclick="deleteRow('${tableName}', ${row.id})">Sil</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="action-row">
      <div class="action-row-left">
        <input type="text" placeholder="Yeni değer ekle..." id="newParamInput" />
        <button class="btn-add" onclick="addRow('${tableName}')">Ekle</button>
      </div>
      <button class="btn-save" onclick="saveOrder('${tableName}')">Kaydet</button>
    </div>
  `;

  // Drag & drop sıralama
  const tbody = document.querySelector("#sortableTable tbody");
  Sortable.create(tbody, {
    animation: 150,
    handle: 'td:first-child',
  });
}

// Yeni satır ekleme
async function addRow(tableName) {
  const input = document.getElementById("newParamInput");
  const name = input.value.trim();
  if (!name) return alert("Lütfen bir isim girin.");

  await fetch(`/api/params/${tableName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  input.value = "";
  loadTable(tableName);
}

// Silme
async function deleteRow(tableName, id) {
  if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;

  try {
    const res = await fetch(`/api/params/${tableName}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.includes("foreign key")
        ? "❌ Bu parametre bazı ürünlerde kullanıldığı için silinemez."
        : "❌ Silme işlemi başarısız oldu.";
      alert(msg);
      return;
    }
    loadTable(tableName);
  } catch (error) {
    alert("❌ Sunucu hatası: " + error.message);
  }
}

// Ad güncelleme
async function updateName(tableName, id, newName) {
  await fetch(`/api/params/${tableName}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName })
  });
}

// Aktif/pasif
async function toggleActive(tableName, id, active) {
  await fetch(`/api/params/${tableName}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: active })
  });
}

// Sıralama kaydet
async function saveOrder(tableName) {
  const rows = Array.from(document.querySelectorAll("#sortableTable tbody tr[data-id]"));
  const orders = rows.map((tr, index) => ({
    id: parseInt(tr.dataset.id),
    sort_order: index + 1
  }));

  const res = await fetch(`/api/params/${tableName}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders })
  });

  if (res.ok) {
    alert("✅ Kaydedildi.");
  } else {
    alert("❌ Hata oluştu, sıralama kaydedilemedi.");
  }
}
