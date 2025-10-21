const allColumns = [
    { key: "sample_status", label: "Numune Durumu" },
    { key: "model_kodu", label: "Model Kodu" },
    { key: "product_group", label: "Ürün Grubu" },
    { key: "line", label: "Line" },
    { key: "fabric_type", label: "Kumaş Tipi" },
    { key: "fit_type", label: "Fit Tipi" },
    { key: "colors", label: "Renkler" },
    { key: "updated_at", label: "Güncellenme Tarihi" }
  ];
  
  async function loadColumns() {
    const res = await fetch('/api/ui/columns/samples');
    const selected = await res.json();
    const container = document.getElementById("columnCheckboxes");
    container.innerHTML = "";
  
    allColumns.forEach(col => {
      const checked = selected.includes(col.key);
      container.innerHTML += `
        <label>
          <input type="checkbox" value="${col.key}" ${checked ? "checked" : ""}/>
          ${col.label}
        </label>`;
    });
  }
  
  async function saveColumns() {
    const checked = Array.from(document.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
    await fetch('/api/ui/columns/samples', {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible_columns: checked })
    });
    alert("Sütun görünürlüğü kaydedildi!");
  }
  
  document.addEventListener("DOMContentLoaded", loadColumns);
  