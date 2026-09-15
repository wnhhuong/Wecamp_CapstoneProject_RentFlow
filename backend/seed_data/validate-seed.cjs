/*
 * Kiểm tra seed.json trước khi gửi cho backend hoặc nạp vào database.
 * Không cần kết nối MongoDB: chỉ kiểm tra quan hệ, enum và các số tiền.
 */
const fs = require('node:fs');
const path = require('node:path');

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));
const errors = [];
const objectId = /^[a-f\d]{24}$/i;

const idsByCollection = new Map();
for (const [collection, records] of Object.entries(seed)) {
  if (!Array.isArray(records)) continue;
  const ids = new Set();
  idsByCollection.set(collection, ids);
  for (const record of records) {
    if (!objectId.test(record._id || '')) {
      errors.push(`${collection}: _id '${record._id}' is not a 24-character ObjectId`);
    }
    if (ids.has(record._id)) errors.push(`${collection}: duplicate _id '${record._id}'`);
    ids.add(record._id);
  }
}

function checkReference(collection, field, targetCollection) {
  const targets = idsByCollection.get(targetCollection) || new Set();
  for (const record of seed[collection] || []) {
    if (record[field] !== undefined && !targets.has(record[field])) {
      errors.push(`${collection}/${record._id}: ${field} does not reference ${targetCollection}`);
    }
  }
}

[
  ['rooms', 'areaID', 'areas'],
  ['accounts', 'roomID', 'rooms'],
  ['contracts', 'userID', 'users'],
  ['contracts', 'roomID', 'rooms'],
  ['facilities', 'typeID', 'facilityTypes'],
  ['facilities', 'roomID', 'rooms'],
  ['consumptions', 'roomID', 'rooms'],
  ['invoices', 'comsumptionID', 'consumptions'],
  ['requests', 'roomID', 'rooms'],
  ['requests', 'userID', 'users'],
  ['latePaymentRequests', 'requestID', 'requests'],
  ['latePaymentRequests', 'invoiceID', 'invoices'],
  ['paidRequests', 'requestID', 'requests'],
  ['paidRequests', 'invoiceID', 'invoices'],
  ['consumpRequests', 'requestID', 'requests'],
  ['extendRequests', 'requestID', 'requests'],
  ['extendRequests', 'contractID', 'contracts'],
  ['moveoutRequests', 'requestID', 'requests'],
  ['moveoutRequests', 'contractID', 'contracts'],
  ['checkoutRequests', 'requestID', 'requests'],
  ['checkoutRequests', 'contractID', 'contracts'],
  ['tickets', 'roomID', 'rooms'],
  ['repairs', 'ticketID', 'tickets'],
  ['repairs', 'facilityID', 'facilities'],
  ['complains', 'ticketID', 'tickets'],
  ['complains', 'areaID', 'areas'],
  ['complains', 'roomID', 'rooms'],
].forEach(([collection, field, target]) => checkReference(collection, field, target));

const allowed = {
  rooms: { field: 'status', values: new Set(['not_available', 'available_soon', 'available_now', 'rented']) },
  accounts: { field: 'status', values: new Set(['active', 'inactive', 'banned']) },
  contracts: { field: 'status', values: new Set(['active', 'expired']) },
  invoices: { field: 'status', values: new Set(['not_paid', 'pending', 'paid']) },
  tickets: { field: 'status', values: new Set(['need_action', 'in_progress', 'done']) },
  requests: { field: 'type', values: new Set(['consump', 'delay', 'checkout', 'paid', 'extend', 'moveout']) },
};
for (const [collection, { field, values }] of Object.entries(allowed)) {
  for (const record of seed[collection] || []) {
    if (!values.has(record[field])) {
      errors.push(`${collection}/${record._id}: invalid ${field}`);
    }
  }
}
for (const record of seed.requests || []) {
  if (!new Set(['pending', 'approved']).has(record.status)) {
    errors.push(`requests/${record._id}: invalid status`);
  }
}

for (const invoice of seed.invoices || []) {
  const fields = ['roomBill', 'electricalBill', 'waterBill', 'wifiBill', 'parkingBill', 'otherBill'];
  const calculatedTotal = fields.reduce((sum, field) => sum + invoice[field], 0);
  if (invoice.totalBill !== calculatedTotal) {
    errors.push(`invoices/${invoice._id}: totalBill ${invoice.totalBill} should be ${calculatedTotal}`);
  }
}

const expectedRequestType = {
  latePaymentRequests: 'delay',
  paidRequests: 'paid',
  consumpRequests: 'consump',
  extendRequests: 'extend',
  moveoutRequests: 'moveout',
  checkoutRequests: 'checkout',
};
const requestsById = new Map((seed.requests || []).map((record) => [record._id, record]));
for (const [collection, type] of Object.entries(expectedRequestType)) {
  for (const record of seed[collection] || []) {
    if (requestsById.get(record.requestID)?.type !== type) {
      errors.push(`${collection}/${record._id}: parent request must have type '${type}'`);
    }
  }
}

if (errors.length) {
  console.error(`Seed validation failed with ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  const collectionCount = [...idsByCollection.values()].length;
  const recordCount = [...idsByCollection.values()].reduce((sum, ids) => sum + ids.size, 0);
  console.log(`Seed is valid: ${recordCount} records across ${collectionCount} collections.`);
}
