let sortColumn = 'sample_status';
let sortAsc = true;
let colorsDict = {};
let productGroups = [];
let selectedGroup = "";

// renk sözlüğü: {1: 'Siyah', 2: 'Ekru', ...}
async function loadColorsDict() {
  const res = await fetch('/api/colors');
  const colors = await res.json();
  colorsDict = Object.fromEntries(colors.map(c => [c.id, c.name]));
}

function formatColors(row) {
  if (row.colors) return row.colors;
  if (Array.isArray(row.color_names)) return row.color_names.join(', ');
  if (Array.isArray(row.color_list))
    return row.color_list.map(id => colorsDict[id] ?? id).join(', ');
  return '';
}

async function loadSamples() {
  const res = await fetch('/api/samples');
  let rows = await res.json();

  if (selectedGroup && selectedGroup.trim() !== "") {
    rows = rows.filter(r => r.product_group === selectedGroup);
  }

  const tbody = document.querySelector('#samplesTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  rows
    .sort((a, b) => {
      const A = a[sortColumn] ?? '';
      const B = b[sortColumn] ?? '';
      if (A < B) return sortAsc ? -1 : 1;
      if (A > B) return sortAsc ? 1 : -1;
      return 0;
    })
    .forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.sample_status ?? ''}</td>
        <td>${r.model_kodu ?? ''}</td>
        <td>${r.product_group ?? ''}</td>
        <td>${r.line ?? ''}</td>
        <td>${r.fabric_type ?? ''}</td>
        <td>${r.fit_type ?? ''}</td>
        <td>${formatColors(r)}</td>
        <td>${new Date(r.updated_at ?? Date.now()).toLocaleDateString()}</td>
        <td><button onclick="editSample('${r.id}')">Edit</button></td>
      `;
      tbody.appendChild(tr);
    });
}

async function loadProductGroups() {
  const res = await fetch('/api/options');
  const data = await res.json();
  const productGroups = data.product_groups || [];

  const select = document.getElementById('productGroupFilter');
  if (!select) return;
  select.innerHTML = '<option value="">Tümü</option>';

  productGroups.forEach(pg => {
    const opt = document.createElement('option');
    opt.value = pg.name;
    opt.textContent = pg.name;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    selectedGroup = e.target.value;
    loadSamples();
  });
}

function sortTable(column) {
  if (sortColumn === column) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = column;
    sortAsc = true;
  }
  loadSamples();
}

function editSample(id) {
  // Birleşik form
  window.location.href = `form.html?id=${id}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadColorsDict();
  await loadProductGroups();
  await loadSamples();
});