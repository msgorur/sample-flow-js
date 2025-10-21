let sortColumn = 'sample_status';
let sortAsc = true;
let colorsDict = {};
let productGroups = [];
let selectedGroup = "";
let visibleColumns = [];


// renk sözlüğü: {1: 'Siyah', 2: 'Ekru', ...}

// 🔹 Renk isimlerini backend'den bir kez çekelim
async function loadColorsDict() {
  const res = await fetch('/api/colors');
  const colors = await res.json();
  colorsDict = Object.fromEntries(colors.map(c => [c.id, c.name]));
}

// 🔹 Renkleri okunabilir hale çevir
function formatColors(row) {
  if (row.colors) return row.colors; // zaten string olarak geldiyse (örn. "Siyah, Ekru")
  if (Array.isArray(row.color_names)) return row.color_names.join(', ');
  if (Array.isArray(row.color_list))
    return row.color_list.map(id => colorsDict[id] ?? id).join(', ');
  return '';
}

async function loadSamples() {
  await loadColumns();
  const res = await fetch('/api/samples');
  const rows = await res.json();

  const tbody = document.querySelector('#samplesTable tbody');
  tbody.innerHTML = '';

  if (!visibleColumns.length) {
    tbody.innerHTML = '<tr><td colspan="10">Görüntülenecek sütun bulunamadı</td></tr>';
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = visibleColumns.map(col => {
      if (col === 'colors') return `<td>${formatColors(r)}</td>`;
      return `<td>${r[col] ?? ''}</td>`;
    }).join('') + `<td><button onclick="editSample('${r.id}')">✏️ Düzenle</button></td>`;
    tbody.appendChild(tr);
  });
}
  

async function loadProductGroups() {
    const res = await fetch('/api/options');
    const data = await res.json();
    const productGroups = data.product_groups || [];
  
    const select = document.getElementById('productGroupFilter');
    select.innerHTML = '<option value="">Tümü</option>'; // reset
  
    productGroups.forEach(pg => {
      const opt = document.createElement('option');
      opt.value = pg.name; // 👈 burada id yerine NAME kullanıyoruz
      opt.textContent = pg.name;
      select.appendChild(opt);
    });
  
    select.addEventListener('change', (e) => {
      selectedGroup = e.target.value; // isim bazlı
      console.log("Seçilen ürün grubu:", selectedGroup); // ✅ test için log
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
  window.location.href = `form.html?id=${id}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadColorsDict(); // önce renk sözlüğünü yükle
  await loadProductGroups(); // filtre dropdown’unu doldur
  await loadColumns(); // sütunları yükle
  await loadSamples();    // sonra ürünleri
});


async function loadColumns() {
  const res = await fetch('/api/ui/columns/samples');
  const cols = await res.json();
  visibleColumns = cols
    .filter(c => c.is_visible)
    .map(c => c.column_name);
  console.log("Görünen sütunlar:", visibleColumns);
}