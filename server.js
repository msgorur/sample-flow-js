// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const serverStartTime = new Date(); // Sunucu başlama anı


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL bağlantısı
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

console.log("Connected with config:", {
  host: process.env.PGHOST,
  db: process.env.PGDATABASE,
  user: process.env.PGUSER
});

// Basit health check
app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/version', (req, res) => {
    res.json({
      version: '1.0.3-params-refactor',
      started_at: serverStartTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
    });
  });
  

// ✅ Model kodu kontrolü (duplicate engellemek için)
app.get('/api/samples/check-model/:model', async (req, res) => {
    try {
      const { model } = req.params;
      const { exclude } = req.query; // edit ekranında mevcut ID'yi hariç tutmak için
  
      let sql = 'SELECT id FROM samples_test1 WHERE model_kodu = $1';
      let params = [model];
  
      if (exclude) {
        sql += ' AND id != $2';
        params.push(exclude);
      }
  
      const { rows } = await pool.query(sql, params);
      res.json({ exists: rows.length > 0 });
    } catch (err) {
      console.error('❌ check-model error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  


// ---------------------------------------------------------------------
// 🧩 Dropdown / Options endpoint
// ---------------------------------------------------------------------
app.get('/api/options', async (req, res) => {
  try {
    const q = async (sql) => (await pool.query(sql)).rows;
    const [product_groups, lines, fabric_types, fabric_suppliers, fit_types,
      collar_types, sample_statuses, design_responsibles, production_responsibles] =
      await Promise.all([
        q(`SELECT id, name, sort_order FROM product_groups WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM lines WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM fabric_types WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM fabric_suppliers WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM fit_types WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM collar_types WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM sample_statuses WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM design_responsibles WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`),
        q(`SELECT id, name, sort_order FROM production_responsibles WHERE is_active IS DISTINCT FROM FALSE ORDER BY sort_order NULLS LAST, name;`)
      ]);

    res.json({
      product_groups, lines, fabric_types, fabric_suppliers, fit_types,
      collar_types, sample_statuses, design_responsibles, production_responsibles
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


// ---------------------------------------------------------------------
// 🧩 Colors endpoint
// ---------------------------------------------------------------------
app.get('/api/colors', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM colors ORDER BY name');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


// ---------------------------------------------------------------------
// 🧩 Yeni sample ekleme (POST)
// ---------------------------------------------------------------------
app.post('/api/samples', async (req, res) => {
  try {
    const {
      model_kodu,
      product_group_id,
      line_id,
      fabric_type_id,
      fabric_supplier_id,
      fit_type_id,
      collar_type_id,
      sample_status_id,
      design_responsible_id,
      production_responsible_id,
      fabric_content,
      fabric_name,
      fabric_width,
      fabric_weight,
      product_description,
      fabric_unit_price,
      print_supplier,
      embroidery_supplier,
      dyeing_supplier,
      color_list // INT[] bekleniyor
    } = req.body;

    if (!model_kodu || !product_group_id || !line_id || !fabric_type_id ||
        !fabric_supplier_id || !fit_type_id || !sample_status_id) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const sql = `
      INSERT INTO samples_test1 (
        model_kodu, product_group_id, line_id, fabric_type_id, fabric_supplier_id,
        fit_type_id, collar_type_id, sample_status_id,
        design_responsible_id, production_responsible_id,
        fabric_content, fabric_name, fabric_width, fabric_weight,
        product_description, fabric_unit_price,
        print_supplier, embroidery_supplier, dyeing_supplier,
        color_list
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
      RETURNING id
    `;

    const params = [
      model_kodu, product_group_id, line_id, fabric_type_id, fabric_supplier_id,
      fit_type_id, collar_type_id, sample_status_id,
      design_responsible_id || null, production_responsible_id || null,
      fabric_content || null, fabric_name || null, fabric_width || null, fabric_weight || null,
      product_description || null, fabric_unit_price || null,
      print_supplier || null, embroidery_supplier || null, dyeing_supplier || null,
      color_list || null
    ];

    const result = await pool.query(sql, params);
    res.json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


// ---------------------------------------------------------------------
// 🧩 Listeleme (JOIN + renk isimleriyle)
// ---------------------------------------------------------------------
app.get('/api/samples', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          s.id,
          s.model_kodu,
          pg.name AS product_group,
          l.name  AS line,
          ft.name AS fabric_type,
          fs.name AS fabric_supplier,
          fit.name AS fit_type,
          ct.name  AS collar_type,
          ss.name  AS sample_status,
          s.updated_at,
          array_to_string(cn.color_names, ', ') AS colors
        FROM samples_test1 s
        LEFT JOIN product_groups pg ON pg.id = s.product_group_id
        LEFT JOIN lines l ON l.id = s.line_id
        LEFT JOIN fabric_types ft ON ft.id = s.fabric_type_id
        LEFT JOIN fabric_suppliers fs ON fs.id = s.fabric_supplier_id
        LEFT JOIN fit_types fit ON fit.id = s.fit_type_id
        LEFT JOIN collar_types ct ON ct.id = s.collar_type_id
        LEFT JOIN sample_statuses ss ON ss.id = s.sample_status_id
        LEFT JOIN LATERAL (
          SELECT array_agg(c.name ORDER BY c.name) AS color_names
          FROM colors c
          WHERE s.color_list IS NOT NULL AND c.id = ANY(s.color_list)
        ) cn ON TRUE
        ORDER BY s.created_at DESC;  -- 🔹 en son eklenen en üstte
      `);
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
  

// ---------------------------------------------------------------------
// 🧩 Tek sample detay (ID bazlı GET)
// ---------------------------------------------------------------------
app.get('/api/samples/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT
        s.*,
        cn.color_names
      FROM samples_test1 s
      LEFT JOIN LATERAL (
        SELECT array_agg(c.name ORDER BY c.name) AS color_names
        FROM colors c
        WHERE s.color_list IS NOT NULL AND c.id = ANY(s.color_list)
      ) cn ON TRUE
      WHERE s.id = $1
    `, [id]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


// ---------------------------------------------------------------------
// 🧩 Sample güncelleme (PUT)
// ---------------------------------------------------------------------
app.put("/api/samples/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const {
        model_kodu,
        product_group_id,
        line_id,
        fabric_type_id,
        fabric_supplier_id,
        fit_type_id,
        collar_type_id,
        sample_status_id,
        color_ids, // 👈 frontend'den bu geliyor
      } = req.body;
      const colorArray = Array.isArray(color_ids) && color_ids.length > 0 ? color_ids : null;
  
      await pool.query(
        `
        UPDATE samples_test1 SET
          model_kodu=$1,
          product_group_id=$2,
          line_id=$3,
          fabric_type_id=$4,
          fabric_supplier_id=$5,
          fit_type_id=$6,
          collar_type_id=$7,
          sample_status_id=$8,
          color_list=$9,
          updated_at=NOW()
        WHERE id=$10
      `,
        [
          model_kodu,
          product_group_id,
          line_id,
          fabric_type_id,
          fabric_supplier_id,
          fit_type_id,
          collar_type_id,
          sample_status_id,
          colorArray, 
          id,
        ]
      );
  
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  
// ---------------------------------------------------------------------
// 🧩 Parametre yönetimi (genel CRUD)
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// 🧩 Parametre Yönetimi (Tüm tablolar için ortak CRUD)
// ---------------------------------------------------------------------

app.get('/api/params/:table', async (req, res) => {
    try {
      const { table } = req.params;
      const { rows } = await pool.query(`SELECT id, name, is_active, sort_order FROM ${table} ORDER BY sort_order NULLS LAST, id`);
      res.json(rows);
    } catch (err) {
      console.error('GET params error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  
  
  app.post('/api/params/:table', async (req, res) => {
    const { table } = req.params;
    const { name } = req.body;
    try {
      const { rows } = await pool.query(`INSERT INTO ${table} (name, is_active, sort_order) VALUES ($1, true, COALESCE((SELECT MAX(sort_order)+1 FROM ${table}), 1)) RETURNING *`, [name]);
      res.json(rows[0]);
    } catch (err) {
      console.error('POST params error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/params/:table/reorder', async (req, res) => {
    const { table } = req.params;
    const { orders } = req.body;
  
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid order data.' });
    }
  
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, sort_order } of orders) {
        await client.query(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [sort_order, id]);
      }
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Reorder error:', e);
      res.status(500).json({ error: e.message });
    } finally {
      client.release();
    }
  });
  
  app.put('/api/params/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const { name, is_active } = req.body;
    try {
      await pool.query(`UPDATE ${table} SET name=$1, is_active=$2 WHERE id=$3`, [name, is_active, id]);
      res.json({ ok: true });
    } catch (err) {
      console.error('PUT params error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  
  app.delete('/api/params/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    try {
      await pool.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE params error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  

  
  
  


// ---------------------------------------------------------------------
// 🧩 Sunucu başlat
// ---------------------------------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
