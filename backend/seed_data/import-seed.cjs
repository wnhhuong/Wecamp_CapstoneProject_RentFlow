/*
 * Nạp dữ liệu development/demo vào MongoDB.
 * Mặc định KHÔNG xoá dữ liệu sẵn có. Dùng --reset chỉ khi muốn xoá các
 * collection RentFlow rồi nạp lại toàn bộ seed.
 */
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const seedPath = path.join(__dirname, 'seed.json');
const validatePath = path.join(__dirname, 'validate-seed.cjs');
require(validatePath);
if (process.exitCode) process.exit(process.exitCode);

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) throw new Error('MONGO_URI is required. Example: MONGO_URI=mongodb://localhost:27017/rentflow');

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const reset = process.argv.includes('--reset');

const collectionOrder = [
  ['parameters', 'parameters'],
  ['areas', 'areas'],
  ['facilityTypes', 'facilitytypes'],
  ['rooms', 'rooms'],
  ['users', 'users'],
  ['accounts', 'accounts'],
  ['contracts', 'contracts'],
  ['facilities', 'facilities'],
  ['consumptions', 'consumptions'],
  ['invoices', 'invoices'],
  ['requests', 'requests'],
  ['latePaymentRequests', 'latepaymentrequests'],
  ['paidRequests', 'paidrequests'],
  ['consumpRequests', 'consumprequests'],
  ['extendRequests', 'extendrequests'],
  ['moveoutRequests', 'moveoutrequests'],
  ['checkoutRequests', 'checkoutrequests'],
  ['tickets', 'tickets'],
  ['repairs', 'repairs'],
  ['complains', 'complains'],
];

const objectIdFields = new Set([
  '_id', 'areaID', 'roomID', 'userID', 'typeID', 'comsumptionID', 'requestID',
  'invoiceID', 'contractID', 'ticketID', 'facilityID',
]);
const dateFields = new Set([
  'DoB', 'startDate', 'expireDate', 'availableFrom', 'lastModified', 'trackingTime',
  'createdDate', 'paymentDate', 'dueDate', 'createDate', 'resolveDate', 'capturedAt',
  'requestMoveoutDate', 'signedAt',
]);

function convertDocument(record) {
  const converted = {};
  for (const [key, value] of Object.entries(record)) {
    if (objectIdFields.has(key) && typeof value === 'string') converted[key] = new mongoose.Types.ObjectId(value);
    else if (dateFields.has(key) && typeof value === 'string') converted[key] = new Date(value);
    else converted[key] = value;
  }
  return converted;
}

async function prepareAccount(record) {
  const account = convertDocument(record);
  const marker = '__HASH_BEFORE_INSERT__:';
  if (typeof account.password === 'string' && account.password.startsWith(marker)) {
    account.password = await bcrypt.hash(account.password.slice(marker.length), 10);
  }
  return account;
}

async function main() {
  await mongoose.connect(mongoUri);
  try {
    for (const [seedKey, collectionName] of collectionOrder) {
      const collection = mongoose.connection.collection(collectionName);
      if (reset) await collection.deleteMany({});

      let records = seed[seedKey].map(convertDocument);
      if (seedKey === 'accounts') records = await Promise.all(seed[seedKey].map(prepareAccount));
      if (records.length) await collection.insertMany(records, { ordered: true });
      console.log(`${collectionName}: inserted ${records.length}`);
    }
    console.log('Seed import completed.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Seed import failed:', error.message);
  process.exitCode = 1;
});
