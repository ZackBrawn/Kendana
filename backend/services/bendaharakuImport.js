const SUPPORTED_TRANSACTION_TYPES = new Map([
  ['income', 'Income'],
  ['expense', 'Expense'],
  ['transfer', 'Transfer'],
  ['debt', 'Debt'],
  ['receivable', 'Receivable']
]);

const MAX_RECORDS = 10000;

class ImportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportValidationError';
    this.statusCode = 400;
  }
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ImportValidationError(`${label} harus berupa object JSON.`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new ImportValidationError(`Ekspor tidak memuat array ${label}.`);
  }
  if (value.length > MAX_RECORDS) {
    throw new ImportValidationError(`Jumlah ${label} melebihi batas ${MAX_RECORDS}.`);
  }
  return value;
}

function sourceId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ImportValidationError(`${label} harus berupa ID positif.`);
  }
  return id;
}

function optionalSourceId(value, label) {
  return value === null || value === undefined ? null : sourceId(value, label);
}

function optionalInteger(value, label) {
  if (value === null || value === undefined) return null;
  const integer = Number(value);
  if (!Number.isSafeInteger(integer)) {
    throw new ImportValidationError(`${label} harus berupa bilangan bulat atau null.`);
  }
  return integer;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ImportValidationError(`${label} wajib berupa teks.`);
  }
  return value;
}

function optionalText(value, label) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new ImportValidationError(`${label} harus berupa teks atau null.`);
  }
  return value;
}

function decimal(value, label) {
  if (typeof value !== 'string') {
    throw new ImportValidationError(`${label} harus berupa teks decimal agar presisinya terjaga.`);
  }
  const text = value;
  if (!/^-?\d{1,13}(?:\.\d{1,2})?$/.test(text)) {
    throw new ImportValidationError(`${label} bukan nilai decimal 15,2 yang valid.`);
  }
  return text;
}

function booleanValue(value, label, nullable = false) {
  if (nullable && (value === null || value === undefined)) return null;
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  throw new ImportValidationError(`${label} harus berupa boolean.`);
}

function dateValue(value, label, dateOnly = false) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ImportValidationError(`${label} harus berupa tanggal atau null.`);
  }

  const text = value.trim();
  if (dateOnly) {
    const match = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(text);
    if (!match) throw new ImportValidationError(`${label} harus menggunakan format YYYY-MM-DD.`);
    const date = new Date(`${match[1]}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) {
      throw new ImportValidationError(`${label} bukan tanggal kalender yang valid.`);
    }
    return date;
  }

  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text)
    ? text.replace(' ', 'T')
    : `${text.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new ImportValidationError(`${label} bukan timestamp yang valid.`);
  }
  return date;
}

function uniqueIds(rows, label) {
  const ids = new Set();
  for (const row of rows) {
    const id = sourceId(row.id, `${label}.id`);
    if (ids.has(id)) throw new ImportValidationError(`ID ${label} duplikat: ${id}.`);
    ids.add(id);
  }
  return ids;
}

function prepareBendaharakuImport(payload, targetUser) {
  requireRecord(payload, 'Root ekspor');
  const sourceUser = requireRecord(payload.user, 'user');
  const sourceUserId = sourceId(sourceUser.id, 'user.id');
  const sourceEmail = requiredText(sourceUser.email, 'user.email').trim().toLowerCase();
  if (!targetUser || typeof targetUser.email !== 'string' ||
      sourceEmail !== targetUser.email.trim().toLowerCase()) {
    throw new ImportValidationError('Email user ekspor harus sama dengan akun Kendana yang sedang login.');
  }

  const sourceTypes = requireArray(payload.transaction_types, 'transaction_types');
  if (sourceTypes.length === 0) {
    throw new ImportValidationError('Ekspor tidak memiliki definisi transaction_types.');
  }
  uniqueIds(sourceTypes, 'transaction_types');
  const typeNameBySourceId = new Map();
  for (const sourceType of sourceTypes) {
    const id = sourceId(sourceType.id, 'transaction_types.id');
    const name = requiredText(sourceType.name, `transaction_types[${id}].name`);
    const canonicalName = SUPPORTED_TRANSACTION_TYPES.get(name.trim().toLowerCase());
    if (!canonicalName) {
      throw new ImportValidationError(`Tipe transaksi sumber tidak didukung: ${name}.`);
    }
    typeNameBySourceId.set(id, canonicalName);
  }

  const sourceWallets = requireArray(payload.wallets, 'wallets');
  uniqueIds(sourceWallets, 'wallets');
  const walletIds = new Set();
  const wallets = sourceWallets.map((row) => {
    const id = sourceId(row.id, 'wallets.id');
    if (sourceId(row.user_id, `wallet ${id}.user_id`) !== sourceUserId) {
      throw new ImportValidationError(`Wallet ${id} bukan milik user sumber.`);
    }
    walletIds.add(id);
    return {
      source_id: id,
      name: requiredText(row.name, `wallet ${id}.name`),
      balance: decimal(row.balance, `wallet ${id}.balance`),
      group_type: requiredText(row.group_type, `wallet ${id}.group_type`),
      icon: optionalText(row.icon, `wallet ${id}.icon`),
      keyword: optionalText(row.keyword, `wallet ${id}.keyword`),
      is_active: booleanValue(row.is_active, `wallet ${id}.is_active`),
      deleted_at: dateValue(row.deleted_at, `wallet ${id}.deleted_at`),
      is_pinned: booleanValue(row.is_pinned, `wallet ${id}.is_pinned`, true),
      account_name: optionalText(row.account_name, `wallet ${id}.account_name`),
      account_number: optionalText(row.account_number, `wallet ${id}.account_number`),
      bank_code: optionalText(row.bank_code, `wallet ${id}.bank_code`),
      created_at: dateValue(row.created_at, `wallet ${id}.created_at`),
      updated_at: dateValue(row.updated_at, `wallet ${id}.updated_at`)
    };
  });

  const sourceCategories = requireArray(payload.categories, 'categories');
  uniqueIds(sourceCategories, 'categories');
  const categoryIds = new Set();
  const categories = sourceCategories.map((row) => {
    const id = sourceId(row.id, 'categories.id');
    if (sourceId(row.user_id, `category ${id}.user_id`) !== sourceUserId) {
      throw new ImportValidationError(`Kategori ${id} bukan milik user sumber.`);
    }
    const typeId = sourceId(row.type_id, `category ${id}.type_id`);
    if (!typeNameBySourceId.has(typeId)) {
      throw new ImportValidationError(`Tipe sumber ${typeId} untuk kategori ${id} tidak ditemukan.`);
    }
    categoryIds.add(id);
    return {
      source_id: id,
      type_source_id: typeId,
      category_name: requiredText(row.category_name, `category ${id}.category_name`),
      icon: optionalText(row.icon, `category ${id}.icon`),
      keyword: optionalText(row.keyword, `category ${id}.keyword`),
      is_active: booleanValue(row.is_active, `category ${id}.is_active`),
      deleted_at: dateValue(row.deleted_at, `category ${id}.deleted_at`),
      system_key: optionalText(row.system_key, `category ${id}.system_key`),
      custom_name: optionalText(row.custom_name, `category ${id}.custom_name`),
      custom_icon: optionalText(row.custom_icon, `category ${id}.custom_icon`),
      custom_keyword: optionalText(row.custom_keyword, `category ${id}.custom_keyword`),
      created_at: dateValue(row.created_at, `category ${id}.created_at`),
      updated_at: dateValue(row.updated_at, `category ${id}.updated_at`)
    };
  });

  const sourceTransactions = requireArray(payload.transactions, 'transactions');
  uniqueIds(sourceTransactions, 'transactions');
  const references = new Set();
  const transactions = sourceTransactions.map((row) => {
    const id = sourceId(row.id, 'transactions.id');
    if (sourceId(row.user_id, `transaction ${id}.user_id`) !== sourceUserId) {
      throw new ImportValidationError(`Transaksi ${id} bukan milik user sumber.`);
    }
    const typeId = sourceId(row.type_id, `transaction ${id}.type_id`);
    if (!typeNameBySourceId.has(typeId)) {
      throw new ImportValidationError(
        `Tipe transaksi sumber ${typeId} pada transaksi ${id} tidak ditemukan.`
      );
    }
    const sourceWalletId = sourceId(row.source_wallet_id, `transaction ${id}.source_wallet_id`);
    if (!walletIds.has(sourceWalletId)) {
      throw new ImportValidationError(
        `Wallet sumber ${sourceWalletId} yang dirujuk transaksi ${id} tidak ada di ekspor.`
      );
    }
    const destinationWalletId = optionalSourceId(
      row.destination_wallet_id,
      `transaction ${id}.destination_wallet_id`
    );
    if (destinationWalletId !== null && !walletIds.has(destinationWalletId)) {
      throw new ImportValidationError(
        `Wallet tujuan ${destinationWalletId} yang dirujuk transaksi ${id} tidak ada di ekspor.`
      );
    }
    const categoryId = optionalSourceId(row.category_id, `transaction ${id}.category_id`);
    if (categoryId !== null && !categoryIds.has(categoryId)) {
      throw new ImportValidationError(
        `Kategori sumber ${categoryId} yang dirujuk transaksi ${id} tidak ada di ekspor.`
      );
    }
    const referenceNumber = requiredText(row.reference_number, `transaction ${id}.reference_number`);
    if (references.has(referenceNumber)) {
      throw new ImportValidationError(`reference_number duplikat dalam ekspor: ${referenceNumber}.`);
    }
    references.add(referenceNumber);

    return {
      source_id: id,
      reference_number: referenceNumber,
      date: dateValue(row.date, `transaction ${id}.date`, true),
      type_source_id: typeId,
      category_source_id: categoryId,
      source_wallet_source_id: sourceWalletId,
      destination_wallet_source_id: destinationWalletId,
      amount: decimal(row.amount, `transaction ${id}.amount`),
      balance_before: decimal(row.balance_before, `transaction ${id}.balance_before`),
      balance_after: decimal(row.balance_after, `transaction ${id}.balance_after`),
      subject: optionalText(row.subject, `transaction ${id}.subject`),
      notes: optionalText(row.notes, `transaction ${id}.notes`),
      is_cleared: booleanValue(row.is_cleared, `transaction ${id}.is_cleared`),
      deleted_at: dateValue(row.deleted_at, `transaction ${id}.deleted_at`),
      created_at: dateValue(row.created_at, `transaction ${id}.created_at`),
      updated_at: dateValue(row.updated_at, `transaction ${id}.updated_at`),
      due_date: dateValue(row.due_date, `transaction ${id}.due_date`, true),
      due_date_type: optionalText(row.due_date_type, `transaction ${id}.due_date_type`),
      due_date_interval: optionalInteger(
        row.due_date_interval,
        `transaction ${id}.due_date_interval`
      )
    };
  });

  return {
    sourceUser: {
      id: sourceUserId,
      email: sourceEmail
    },
    typeNameBySourceId,
    transactionTypeNames: [...new Set(typeNameBySourceId.values())],
    wallets,
    categories,
    transactions
  };
}

module.exports = {
  ImportValidationError,
  prepareBendaharakuImport
};
