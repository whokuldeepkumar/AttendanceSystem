const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Fix Badal Kumar with trailing space
    const r1 = await pool.query(
      'UPDATE employees SET employee_code = $1 WHERE TRIM(name) = $2 RETURNING name, employee_code',
      ['400054', 'Badal Kumar']
    );
    if (r1.rowCount > 0) console.log('[OK] Updated: Badal Kumar -> 400054');
    
    // Fix MD IRFAN with trailing space  
    const r2 = await pool.query(
      'UPDATE employees SET employee_code = $1 WHERE TRIM(name) = $2 RETURNING name, employee_code',
      ['400057', 'MD IRFAN']
    );
    if (r2.rowCount > 0) console.log('[OK] Updated: MD IRFAN -> 400057');
    
    // Verify all codes assigned
    const verify = await pool.query('SELECT COUNT(*) FROM employees WHERE employee_code IS NULL');
    console.log(`\nFinal check: ${verify.rows[0].count} employees without codes`);
    
    if (verify.rows[0].count === 0) {
      console.log('[SUCCESS] All 12 employees now have Genus codes!');
      
      // Show summary
      const summary = await pool.query('SELECT COUNT(*), SUM(CASE WHEN employee_code IS NOT NULL THEN 1 ELSE 0 END) as coded FROM employees');
      console.log(`\nTotal employees: ${summary.rows[0].count}, With codes: ${summary.rows[0].coded}`);
    }
    
    pool.end();
  } catch (err) {
    console.error('[ERROR]', err.message);
    pool.end();
  }
})();
