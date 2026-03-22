/**
 * Task Tracker PWA → Google Sheets Sync
 * ──────────────────────────────────────
 * Deploy as: Web App (Execute as: Me, Access: Anyone)
 * The PWA POSTs all tasks grouped by company.
 * This script writes one tab per company + a Summary tab.
 *
 * Setup:
 *   1. Create a new Google Sheet (this will be your sync target)
 *   2. Open Extensions → Apps Script
 *   3. Paste this entire file into Code.gs
 *   4. Click Deploy → New deployment → Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Copy the deployment URL → paste into PWA Settings
 *
 * Payload format (from PWA):
 * {
 *   "rubii":    { "name": "Rubii",         "tasks": [ {id, title, dept, ...} ] },
 *   "dc":       { "name": "Dream Crafter",  "tasks": [...] },
 *   "conts":    { "name": "The Conts",       "tasks": [...] },
 *   "hookka":   { "name": "Hookka",          "tasks": [...] },
 *   "gh":       { "name": "Golden Home",     "tasks": [...] },
 *   "carres":   { "name": "Carres",          "tasks": [...] }
 * }
 */

const HEADERS = [
  'ID', 'Title', 'Department', 'Project', 'Status', 'Priority',
  'Deadline', 'Notes', 'Subtasks', 'Progress', 'Created', 'Updated'
];

const TASK_FIELDS = [
  'id', 'title', 'dept', 'project', 'status', 'priority',
  'deadline', 'notes', 'subtasks', 'progress', 'createdAt', 'updatedAt'
];

// Company display order (matches PWA)
const COMPANY_ORDER = ['rubii', 'dc', 'conts', 'hookka', 'gh', 'carres'];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let totalTasks = 0;
    const summaryData = [];

    // Process each company tab
    COMPANY_ORDER.forEach(key => {
      const co = payload[key];
      if (!co) return;

      const sheetName = co.name;
      let sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      } else {
        sheet.clear();
      }

      // Headers
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      formatHeaders_(sheet);

      // Task rows
      const tasks = co.tasks || [];
      if (tasks.length > 0) {
        const rows = tasks.map(t => TASK_FIELDS.map(f => t[f] || ''));
        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      }

      // Auto-resize columns
      HEADERS.forEach((_, i) => sheet.autoResizeColumn(i + 1));

      // Collect summary stats
      const statusCounts = {};
      tasks.forEach(t => {
        const s = t.status || 'Unknown';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });

      summaryData.push({
        company: sheetName,
        total: tasks.length,
        overdue: statusCounts['Overdue'] || 0,
        todo: statusCounts['To Do'] || 0,
        inProgress: statusCounts['In Progress'] || 0,
        done: statusCounts['Done'] || 0
      });

      totalTasks += tasks.length;
    });

    // Build Summary tab
    writeSummary_(ss, summaryData, totalTasks);

    // Move Summary to first position
    const sumSheet = ss.getSheetByName('Summary');
    if (sumSheet) ss.setActiveSheet(sumSheet);
    if (sumSheet) ss.moveActiveSheet(1);

    // Clean up default Sheet1 if it exists and is empty
    const sheet1 = ss.getSheetByName('Sheet1');
    if (sheet1 && sheet1.getLastRow() === 0) {
      ss.deleteSheet(sheet1);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', tasks: totalTasks, timestamp: new Date().toISOString() })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Write the Summary tab with per-company stats
 */
function writeSummary_(ss, data, totalTasks) {
  let sheet = ss.getSheetByName('Summary');
  if (!sheet) {
    sheet = ss.insertSheet('Summary');
  } else {
    sheet.clear();
  }

  // Title row
  sheet.getRange('A1').setValue('Task Tracker — Sync Summary');
  sheet.getRange('A1').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('Last synced: ' + new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }));
  sheet.getRange('A2').setFontColor('#6E6E73');
  sheet.getRange('A3').setValue('Total tasks: ' + totalTasks);
  sheet.getRange('A3').setFontWeight('bold');

  // Table headers
  const sumHeaders = ['Company', 'Total', 'Overdue', 'To Do', 'In Progress', 'Done'];
  sheet.getRange(5, 1, 1, sumHeaders.length).setValues([sumHeaders]);
  sheet.getRange(5, 1, 1, sumHeaders.length)
    .setFontWeight('bold')
    .setBackground('#F2F2F7')
    .setBorder(false, false, true, false, false, false, '#D1D1D6', SpreadsheetApp.BorderStyle.SOLID);

  // Data rows
  if (data.length > 0) {
    const rows = data.map(d => [d.company, d.total, d.overdue, d.todo, d.inProgress, d.done]);
    sheet.getRange(6, 1, rows.length, sumHeaders.length).setValues(rows);

    // Highlight overdue cells > 0
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][2] > 0) {
        sheet.getRange(6 + i, 3).setFontColor('#FF3B30').setFontWeight('bold');
      }
    }

    // Totals row
    const totalsRow = 6 + rows.length;
    sheet.getRange(totalsRow, 1).setValue('TOTAL').setFontWeight('bold');
    for (let c = 2; c <= sumHeaders.length; c++) {
      sheet.getRange(totalsRow, c)
        .setFormula(`=SUM(${columnLetter_(c)}6:${columnLetter_(c)}${totalsRow - 1})`)
        .setFontWeight('bold');
    }
  }

  // Auto-resize
  sumHeaders.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

/**
 * Format header row on company sheets
 */
function formatHeaders_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#F2F2F7')
    .setBorder(false, false, true, false, false, false, '#D1D1D6', SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(1);
}

/**
 * Convert column number to letter (1=A, 2=B, etc.)
 */
function columnLetter_(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * GET handler — returns simple status page (optional, for testing)
 */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: 'ok',
      app: 'Task Tracker Sync',
      version: '1.0',
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}
