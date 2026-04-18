const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const employees = [
  { name: 'Kuldeep Kumar', code: '400049' },
  { name: 'Bharat Mewara', code: '400050' },
  { name: 'Pradeep Suwalka', code: '400051' },
  { name: 'NAVEEN VERMA', code: '400052' },
  { name: 'Shubham soni', code: '400053' },
  { name: 'Badal Kumar', code: '400054' },
  { name: 'Rishi Agrawal', code: '400055' },
  { name: 'Rohit Gupta', code: '400056' },
  { name: 'MD IRFAN', code: '400057' },
  { name: 'Rohit Kumar', code: '400058' },
  { name: 'Kamran Ashraf', code: '400059' },
  { name: 'Irfan', code: '400060' }
];

(async () => {
  try {
    console.log('Starting employee code population...\n');
    
    for (const emp of employees) {
      const result = await pool.query(
        'UPDATE employees SET employee_code = $1 WHERE name = $2 RETURNING id, name, employee_code',
        [emp.code, emp.name]
      );
      
      if (result.rows.length > 0) {
        console.log(`[OK] Updated: ${emp.name} -> ${emp.code}`);
      } else {
        console.log(`[WARN] Not found: ${emp.name}`);
      }
    }
    
    // Verify
    console.log('\nVerifying...');
    const verify = await pool.query('SELECT id, name, employee_code FROM employees WHERE employee_code IS NULL');
    console.log(`Employees without codes: ${verify.rows.length}`);
    
    if (verify.rows.length === 0) {
      console.log('[SUCCESS] All employees have been assigned codes!');
      
      // Show all employees
      const all = await pool.query('SELECT id, name, employee_code FROM employees ORDER BY id');
      console.log('\nAll employees:');
      all.rows.forEach(row => {
        console.log(`  ${row.id}. ${row.name} -> ${row.employee_code}`);
      });
    } else {
      console.log('[ERROR] Some employees still missing codes:');
      verify.rows.forEach(row => {
        console.log(`  - ${row.name} (ID: ${row.id})`);
      });
    }
    
    pool.end();
  } catch (err) {
    console.error('[ERROR]', err.message);
    pool.end();
    process.exit(1);
  }
})();
